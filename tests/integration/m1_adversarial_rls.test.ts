import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';
import { mockSupabase } from '@/services/mockSupabase';

describe('Milestone 1 Adversarial RLS & Storage Engine Stress Harness', () => {
  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
  });

  // ==========================================================================
  // VECTOR 1: UNAUTHENTICATED BRUTE FORCE & LEAKAGE (ZERO ANON ACCESS)
  // ==========================================================================
  describe('Vector 1: Unauthenticated Attacks (Zero Anonymous Access)', () => {
    beforeEach(async () => {
      await supabase.auth.signOut();
      // Seed data into all 10 tables
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'u-target-1',
            email: 'target@artlake.studio',
            full_name: 'Target User',
            initials: 'TU',
            avatar_url: null,
            role: 'user',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: 'p-target-1',
            name: 'Confidential Project',
            description: 'Top Secret',
            created_by: 'u-target-1',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-target-1',
            project_id: 'p-target-1',
            user_email: 'target@artlake.studio',
            user_id: 'u-target-1',
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 't-target-1',
            project_id: 'p-target-1',
            title: 'Critical Vulnerability Fix',
            description: 'Confidential description',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#CoreDev',
            assignee_id: 'u-target-1',
            queue_order: 1,
            estimated_minutes: 180,
            logged_minutes: 60,
            due_date: null,
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        subtasks: [
          {
            id: 'sub-target-1',
            task_id: 't-target-1',
            title: 'Secret Subtask',
            is_completed: false,
            position: 1,
            created_at: new Date().toISOString(),
          },
        ],
        time_logs: [
          {
            id: 'tl-target-1',
            project_id: 'p-target-1',
            user_id: 'u-target-1',
            task_id: 't-target-1',
            started_at: new Date().toISOString(),
            ended_at: null,
            duration_seconds: 3600,
            is_manual_edit: false,
            year_week: '2026-W45',
            created_at: new Date().toISOString(),
          },
        ],
        task_comments: [
          {
            id: 'tc-target-1',
            task_id: 't-target-1',
            author_id: 'u-target-1',
            content: 'Sensitive architecture note',
            created_at: new Date().toISOString(),
          },
        ],
        task_attachments: [
          {
            id: 'ta-target-1',
            task_id: 't-target-1',
            uploader_id: 'u-target-1',
            file_name: 'keys.pem',
            file_url: 'https://storage/keys.pem',
            file_size: 2048,
            created_at: new Date().toISOString(),
          },
        ],
        weekly_checks: [
          {
            id: 'wc-target-1',
            project_id: 'p-target-1',
            user_id: 'u-target-1',
            year_week: '2026-W45',
            went_well: 'Passed audits',
            obstacles: 'None',
            workload_feeling: '3',
            submitted_at: new Date().toISOString(),
          },
        ],
        notifications: [
          {
            id: 'notif-target-1',
            recipient_id: 'u-target-1',
            project_id: 'p-target-1',
            type: 'assigned',
            message: 'You have been assigned to top secret task',
            related_task_id: 't-target-1',
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ],
      });
    });

    it('must deny SELECT and return 0 leaked rows on all 10 tables when unauthenticated', async () => {
      const tables = [
        'profiles',
        'projects',
        'project_members',
        'tasks',
        'subtasks',
        'time_logs',
        'task_comments',
        'task_attachments',
        'weekly_checks',
        'notifications',
      ] as const;

      for (const table of tables) {
        const res = await supabase.from(table).select('*');
        expect(res.error, `Unexpected error on table ${table}`).toBeNull();
        expect(res.data, `Data leaked on table ${table} for unauthenticated caller!`).toEqual([]);
      }
    });

    it('must return null without error when using .single() or .maybeSingle() while unauthenticated', async () => {
      const singleRes = await supabase.from('projects').select('*').single();
      expect(singleRes.data).toBeNull();
      expect(singleRes.error).toBeNull();

      const maybeRes = await supabase.from('tasks').select('*').maybeSingle();
      expect(maybeRes.data).toBeNull();
      expect(maybeRes.error).toBeNull();
    });

    it('must reject unauthenticated INSERT across multiple tables with RLS error 42501', async () => {
      const taskInsert = await supabase.from('tasks').insert({
        project_id: 'p-target-1',
        title: 'Exploit Task',
        department_tag: '#CoreDev',
      });
      expect(taskInsert.error).not.toBeNull();
      expect(taskInsert.error?.code).toBe('42501');

      const projectInsert = await supabase.from('projects').insert({
        name: 'Hacked Project',
        created_by: 'anon',
      });
      expect(projectInsert.error).not.toBeNull();
      expect(projectInsert.error?.code).toBe('42501');

      const commentInsert = await supabase.from('task_comments').insert({
        task_id: 't-target-1',
        author_id: 'anon',
        content: 'Malicious payload',
      });
      expect(commentInsert.error).not.toBeNull();
      expect(commentInsert.error?.code).toBe('42501');

      const timeLogInsert = await supabase.from('time_logs').insert({
        project_id: 'p-target-1',
        user_id: 'anon',
        task_id: 't-target-1',
        year_week: '2026-W45',
      });
      expect(timeLogInsert.error).not.toBeNull();
      expect(timeLogInsert.error?.code).toBe('42501');
    });

    it('must reject unauthenticated UPDATE with error 42501 and leave rows unmodified', async () => {
      const updateRes = await supabase
        .from('tasks')
        .update({ title: 'Defaced Title' })
        .eq('id', 't-target-1');

      expect(updateRes.error).not.toBeNull();
      expect(updateRes.error?.code).toBe('42501');

      // Verify state was not modified
      const snapshot = mockSupabase.testUtils.getSnapshot();
      const task = snapshot.tasks.find((t) => t.id === 't-target-1');
      expect(task?.title).toBe('Critical Vulnerability Fix');
    });

    it('must reject unauthenticated DELETE with error 42501 and leave rows intact', async () => {
      const deleteRes = await supabase.from('tasks').delete().eq('id', 't-target-1');
      expect(deleteRes.error).not.toBeNull();
      expect(deleteRes.error?.code).toBe('42501');

      const snapshot = mockSupabase.testUtils.getSnapshot();
      expect(snapshot.tasks.find((t) => t.id === 't-target-1')).toBeDefined();
    });
  });

  // ==========================================================================
  // VECTOR 2: CROSS-PROJECT TENANT LEAKAGE & PRIVILEGE ENFORCEMENT
  // ==========================================================================
  describe('Vector 2: Cross-Project Isolation & Multi-Tenant Attack Scenarios', () => {
    const projAlphaId = 'proj-alpha-100';
    const projBetaId = 'proj-beta-200';
    const userAliceId = 'user-alice-001';
    const userBobId = 'user-bob-002';
    const adminId = 'admin-studio-999';

    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: userAliceId,
            email: 'alice@artlake.studio',
            full_name: 'Alice Developer',
            initials: 'AD',
            avatar_url: null,
            role: 'user',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: userBobId,
            email: 'bob@artlake.studio',
            full_name: 'Bob Artist',
            initials: 'BA',
            avatar_url: null,
            role: 'user',
            department: '3D Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: adminId,
            email: 'producer@artlake.studio',
            full_name: 'Studio Producer',
            initials: 'SP',
            avatar_url: null,
            role: 'admin',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: projAlphaId,
            name: 'Project Alpha (Alpha Team Only)',
            description: 'Alpha workspace',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
          {
            id: projBetaId,
            name: 'Project Beta (Beta Team Only)',
            description: 'Beta workspace',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-alpha-alice',
            project_id: projAlphaId,
            user_email: 'alice@artlake.studio',
            user_id: userAliceId,
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-beta-bob',
            project_id: projBetaId,
            user_email: 'bob@artlake.studio',
            user_id: userBobId,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 'task-alpha-1',
            project_id: projAlphaId,
            title: 'Alpha Feature',
            description: 'Alpha details',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#CoreDev',
            assignee_id: userAliceId,
            queue_order: 1,
            estimated_minutes: 120,
            logged_minutes: 30,
            due_date: null,
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'task-beta-1',
            project_id: projBetaId,
            title: 'Beta 3D Rig',
            description: 'Beta secret details',
            status: 'not_started',
            priority: 'medium',
            department_tag: '#3DEnv',
            assignee_id: userBobId,
            queue_order: 1,
            estimated_minutes: 240,
            logged_minutes: 0,
            due_date: null,
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        subtasks: [
          {
            id: 'sub-alpha-1',
            task_id: 'task-alpha-1',
            title: 'Alpha Sub 1',
            is_completed: false,
            position: 1,
            created_at: new Date().toISOString(),
          },
          {
            id: 'sub-beta-1',
            task_id: 'task-beta-1',
            title: 'Beta Sub 1',
            is_completed: false,
            position: 1,
            created_at: new Date().toISOString(),
          },
        ],
        time_logs: [
          {
            id: 'tl-alpha-1',
            project_id: projAlphaId,
            user_id: userAliceId,
            task_id: 'task-alpha-1',
            started_at: new Date().toISOString(),
            ended_at: null,
            duration_seconds: 1800,
            is_manual_edit: false,
            year_week: '2026-W45',
            created_at: new Date().toISOString(),
          },
          {
            id: 'tl-beta-1',
            project_id: projBetaId,
            user_id: userBobId,
            task_id: 'task-beta-1',
            started_at: new Date().toISOString(),
            ended_at: null,
            duration_seconds: 7200,
            is_manual_edit: false,
            year_week: '2026-W45',
            created_at: new Date().toISOString(),
          },
        ],
        weekly_checks: [
          {
            id: 'wc-alpha-alice',
            project_id: projAlphaId,
            user_id: userAliceId,
            year_week: '2026-W45',
            went_well: 'Alpha completed',
            obstacles: 'None',
            workload_feeling: '3',
            submitted_at: new Date().toISOString(),
          },
          {
            id: 'wc-beta-bob',
            project_id: projBetaId,
            user_id: userBobId,
            year_week: '2026-W45',
            went_well: 'Beta completed',
            obstacles: 'None',
            workload_feeling: '4',
            submitted_at: new Date().toISOString(),
          },
        ],
        notifications: [
          {
            id: 'notif-alice',
            recipient_id: userAliceId,
            project_id: projAlphaId,
            type: 'assigned',
            message: 'Assigned to Alpha Feature',
            related_task_id: 'task-alpha-1',
            is_read: false,
            created_at: new Date().toISOString(),
          },
          {
            id: 'notif-bob',
            recipient_id: userBobId,
            project_id: projBetaId,
            type: 'assigned',
            message: 'Assigned to Beta Rig',
            related_task_id: 'task-beta-1',
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ],
      });

      // Authenticate as Alice
      mockSupabase.testUtils.setMockUser({
        id: userAliceId,
        email: 'alice@artlake.studio',
        role: 'user',
      });
    });

    it('prevents Alice from querying Project Beta and all related children records', async () => {
      // 1. Projects: Alice only sees Alpha
      const projRes = await supabase.from('projects').select('*');
      expect(projRes.data?.map((p) => p.id)).toEqual([projAlphaId]);

      // 2. Project Members: Alice only sees Alpha members
      const membersRes = await supabase.from('project_members').select('*');
      expect(membersRes.data?.map((m) => m.id)).toEqual(['pm-alpha-alice']);

      // 3. Tasks: Alice only sees Alpha tasks
      const tasksRes = await supabase.from('tasks').select('*');
      expect(tasksRes.data?.map((t) => t.id)).toEqual(['task-alpha-1']);

      // 4. Subtasks: Alice only sees Alpha subtasks
      const subtasksRes = await supabase.from('subtasks').select('*');
      expect(subtasksRes.data?.map((s) => s.id)).toEqual(['sub-alpha-1']);

      // 5. Time Logs: Alice only sees Alpha time logs
      const timelogsRes = await supabase.from('time_logs').select('*');
      expect(timelogsRes.data?.map((tl) => tl.id)).toEqual(['tl-alpha-1']);

      // 6. Weekly Checks: Alice only sees Alice checks
      const weeklyRes = await supabase.from('weekly_checks').select('*');
      expect(weeklyRes.data?.map((w) => w.id)).toEqual(['wc-alpha-alice']);

      // 7. Notifications: Alice only sees Alice notifications
      const notifRes = await supabase.from('notifications').select('*');
      expect(notifRes.data?.map((n) => n.id)).toEqual(['notif-alice']);
    });

    it('rejects Alice attempting to create tasks, subtasks, or time logs in Project Beta', async () => {
      // Task injection into Beta
      const badTask = await supabase.from('tasks').insert({
        project_id: projBetaId,
        title: 'Alice injected task',
        department_tag: '#CoreDev',
      });
      expect(badTask.error?.code).toBe('42501');

      // Subtask injection into Beta task
      const badSub = await supabase.from('subtasks').insert({
        task_id: 'task-beta-1',
        title: 'Alice injected subtask',
      });
      expect(badSub.error?.code).toBe('42501');

      // Time log injection into Beta project
      const badTimeLog = await supabase.from('time_logs').insert({
        project_id: projBetaId,
        user_id: userAliceId,
        task_id: 'task-beta-1',
        year_week: '2026-W45',
      });
      expect(badTimeLog.error?.code).toBe('42501');

      // Weekly check injection into Beta project
      const badCheck = await supabase.from('weekly_checks').insert({
        project_id: projBetaId,
        user_id: userAliceId,
        year_week: '2026-W45',
        went_well: 'Infiltration',
        obstacles: 'None',
        workload_feeling: '5',
      });
      expect(badCheck.error?.code).toBe('42501');
    });

    it('rejects Alice attempting identity spoofing (inserting time_log with user_id = Bob)', async () => {
      // Even in Alpha, Alice cannot forge a time_log on behalf of Bob
      const spoofRes = await supabase.from('time_logs').insert({
        project_id: projAlphaId,
        user_id: userBobId, // Spoofed user ID!
        task_id: 'task-alpha-1',
        year_week: '2026-W45',
      });
      expect(spoofRes.error?.code).toBe('42501');
    });

    it('rejects Alice attempting to update or delete Beta tasks', async () => {
      const updateRes = await supabase
        .from('tasks')
        .update({ title: 'Tampered by Alice' })
        .eq('id', 'task-beta-1');
      expect(updateRes.error?.code).toBe('42501');

      const deleteRes = await supabase.from('tasks').delete().eq('id', 'task-beta-1');
      expect(deleteRes.error?.code).toBe('42501');
    });

    it('rejects regular users from deleting tasks even in their own project (only admin can delete tasks)', async () => {
      const deleteAlphaRes = await supabase.from('tasks').delete().eq('id', 'task-alpha-1');
      expect(deleteAlphaRes.error?.code).toBe('42501');

      // But Admin CAN delete it
      mockSupabase.testUtils.setMockUser({
        id: adminId,
        email: 'producer@artlake.studio',
        role: 'admin',
      });
      const adminDelRes = await supabase.from('tasks').delete().eq('id', 'task-alpha-1');
      expect(adminDelRes.error).toBeNull();

      const snapshot = mockSupabase.testUtils.getSnapshot();
      expect(snapshot.tasks.find((t) => t.id === 'task-alpha-1')).toBeUndefined();
    });

    it('rejects privilege escalation attempt: non-admin user cannot change their own role to admin', async () => {
      mockSupabase.testUtils.setMockUser({
        id: userAliceId,
        email: 'alice@artlake.studio',
        role: 'user',
      });

      const beforeRpc = await supabase.rpc('is_admin');
      expect(beforeRpc.data).toBe(false);

      const updateRes = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userAliceId);

      expect(updateRes.error).not.toBeNull();
      expect(updateRes.error?.code).toBe('42501');

      const snapshot = mockSupabase.testUtils.getSnapshot();
      const aliceProfile = snapshot.profiles.find((p) => p.id === userAliceId);
      expect(aliceProfile?.role).toBe('user');

      const afterRpc = await supabase.rpc('is_admin');
      expect(afterRpc.data).toBe(false);
    });
  });

  // ==========================================================================
  // VECTOR 3: CASE-INSENSITIVE EMAIL UNIQUENESS & INVITATION BINDING
  // ==========================================================================
  describe('Vector 3: Case-Insensitive Email Collisions & Auto-Binding', () => {
    const adminId = 'admin-user-id';
    const proj1 = 'proj-collision-1';
    const proj2 = 'proj-collision-2';

    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: adminId,
            email: 'admin@artlake.studio',
            full_name: 'Studio Admin',
            initials: 'SA',
            avatar_url: null,
            role: 'admin',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: proj1,
            name: 'Project One',
            description: '',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
          {
            id: proj2,
            name: 'Project Two',
            description: '',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
        ],
      });
      mockSupabase.testUtils.setMockUser({ id: adminId, email: 'admin@artlake.studio', role: 'admin' });
    });

    it('should reject duplicate email invitations with varying cases within the same project', async () => {
      // 1. Initial invitation in lowercase
      const res1 = await supabase.from('project_members').insert({
        project_id: proj1,
        user_email: 'specialist.doe@artlake.studio',
      });
      expect(res1.error).toBeNull();

      // 2. Collision attack with mixed uppercase
      const res2 = await supabase.from('project_members').insert({
        project_id: proj1,
        user_email: 'Specialist.Doe@ArtLake.Studio',
      });
      expect(res2.error).not.toBeNull();
      expect(res2.error?.code).toBe('23505');

      // 3. Collision attack with ALL-CAPS
      const res3 = await supabase.from('project_members').insert({
        project_id: proj1,
        user_email: 'SPECIALIST.DOE@ARTLAKE.STUDIO',
      });
      expect(res3.error).not.toBeNull();
      expect(res3.error?.code).toBe('23505');
    });

    it('should allow identical email to be invited to a different project', async () => {
      // Invite to proj1
      const res1 = await supabase.from('project_members').insert({
        project_id: proj1,
        user_email: 'shared.artist@artlake.studio',
      });
      expect(res1.error).toBeNull();

      // Invite same email (even with different casing) to proj2
      const res2 = await supabase.from('project_members').insert({
        project_id: proj2,
        user_email: 'Shared.Artist@ArtLake.Studio',
      });
      expect(res2.error).toBeNull();

      const snapshot = mockSupabase.testUtils.getSnapshot();
      const count = snapshot.project_members.filter((pm) =>
        pm.user_email.toLowerCase() === 'shared.artist@artlake.studio'
      ).length;
      expect(count).toBe(2);
    });

    it('should auto-bind pending invitations across all projects regardless of case upon Google login', async () => {
      // Seed pending invites in proj1 and proj2
      mockSupabase.testUtils.seedDatabase({
        project_members: [
          {
            id: 'invite-p1',
            project_id: proj1,
            user_email: 'new.member@artlake.studio',
            user_id: null,
            invited_at: new Date().toISOString(),
          },
          {
            id: 'invite-p2',
            project_id: proj2,
            user_email: 'NEW.MEMBER@ARTLAKE.STUDIO',
            user_id: null,
            invited_at: new Date().toISOString(),
          },
        ],
      });

      // New user logs in with mixed case
      const newUser = {
        id: 'new-member-uuid',
        email: 'New.Member@ArtLake.Studio',
        user_metadata: {
          full_name: 'Giulia Roman',
          role: 'user' as const,
        },
      };

      mockSupabase.testUtils.handleNewUserTrigger(newUser);

      // Verify profile creation
      const snapshot = mockSupabase.testUtils.getSnapshot();
      const profile = snapshot.profiles.find((p) => p.id === 'new-member-uuid');
      expect(profile).toBeDefined();
      expect(profile?.full_name).toBe('Giulia Roman');
      expect(profile?.initials).toBe('GR');

      // Verify both invitations were bound to the new user ID
      const p1Invite = snapshot.project_members.find((pm) => pm.id === 'invite-p1');
      const p2Invite = snapshot.project_members.find((pm) => pm.id === 'invite-p2');
      expect(p1Invite?.user_id).toBe('new-member-uuid');
      expect(p2Invite?.user_id).toBe('new-member-uuid');

      // Sign in as Giulia and verify project access
      mockSupabase.testUtils.setMockUser({
        id: 'new-member-uuid',
        email: 'new.member@artlake.studio',
        role: 'user',
      });

      const accessibleProjects = await supabase.from('projects').select('*');
      expect(accessibleProjects.data?.map((p) => p.id).sort()).toEqual([proj1, proj2].sort());
    });
  });

  // ==========================================================================
  // VECTOR 4: CIRCULAR FOREIGN KEY DELETION & ACTIVE TASK NULLIFICATION
  // ==========================================================================
  describe('Vector 4: Circular FK Deletions & Task Lifecycle Constraints', () => {
    const adminId = 'admin-user-id';
    const userA = 'user-alice';
    const userB = 'user-bob';
    const taskId1 = 'hero-task-1';
    const taskId2 = 'hero-task-2';
    const projId = 'proj-active-task-test';

    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: adminId,
            email: 'admin@artlake.studio',
            full_name: 'Studio Admin',
            initials: 'SA',
            avatar_url: null,
            role: 'admin',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: userA,
            email: 'alice@artlake.studio',
            full_name: 'Alice Active',
            initials: 'AA',
            avatar_url: null,
            role: 'user',
            department: '3D Art',
            active_task_id: taskId1, // Alice active on task 1
            created_at: new Date().toISOString(),
          },
          {
            id: userB,
            email: 'bob@artlake.studio',
            full_name: 'Bob Active',
            initials: 'BA',
            avatar_url: null,
            role: 'user',
            department: 'Tech Art',
            active_task_id: taskId2, // Bob active on task 2
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: projId,
            name: 'Active Task Project',
            description: '',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-a',
            project_id: projId,
            user_email: 'alice@artlake.studio',
            user_id: userA,
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-b',
            project_id: projId,
            user_email: 'bob@artlake.studio',
            user_id: userB,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: taskId1,
            project_id: projId,
            title: 'Hero Task 1',
            description: '',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#3DEnv',
            assignee_id: userA,
            queue_order: 1,
            estimated_minutes: 120,
            logged_minutes: 60,
            due_date: null,
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: taskId2,
            project_id: projId,
            title: 'Hero Task 2',
            description: '',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#TechArt',
            assignee_id: userB,
            queue_order: 1,
            estimated_minutes: 180,
            logged_minutes: 40,
            due_date: null,
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        subtasks: [
          {
            id: 'sub-t1-a',
            task_id: taskId1,
            title: 'Subtask for Task 1',
            is_completed: false,
            position: 1,
            created_at: new Date().toISOString(),
          },
        ],
        time_logs: [
          {
            id: 'tl-t1-a',
            project_id: projId,
            user_id: userA,
            task_id: taskId1,
            started_at: new Date().toISOString(),
            ended_at: null,
            duration_seconds: 3600,
            is_manual_edit: false,
            year_week: '2026-W45',
            created_at: new Date().toISOString(),
          },
        ],
        task_comments: [
          {
            id: 'tc-t1-a',
            task_id: taskId1,
            author_id: userA,
            content: 'Comment on task 1',
            created_at: new Date().toISOString(),
          },
        ],
        task_attachments: [
          {
            id: 'ta-t1-a',
            task_id: taskId1,
            uploader_id: userA,
            file_name: 'asset.fbx',
            file_url: 'https://cdn/asset.fbx',
            file_size: 1024,
            created_at: new Date().toISOString(),
          },
        ],
        notifications: [
          {
            id: 'notif-t1-a',
            recipient_id: userA,
            project_id: projId,
            type: 'assigned',
            message: 'You have been assigned to Hero Task 1',
            related_task_id: taskId1,
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ],
      });
      mockSupabase.testUtils.setMockUser({ id: adminId, email: 'admin@artlake.studio', role: 'admin' });
    });

    it('nullifies active_task_id on profiles and cascades all related child entities when active task is deleted', async () => {
      // Admin deletes taskId1
      const delRes = await supabase.from('tasks').delete().eq('id', taskId1);
      expect(delRes.error).toBeNull();

      const snapshot = mockSupabase.testUtils.getSnapshot();

      // 1. Task 1 is deleted
      expect(snapshot.tasks.find((t) => t.id === taskId1)).toBeUndefined();

      // 2. Alice's active_task_id is now NULL
      const alice = snapshot.profiles.find((p) => p.id === userA);
      expect(alice?.active_task_id).toBeNull();

      // 3. Bob's active_task_id remains UNCHANGED (taskId2)
      const bob = snapshot.profiles.find((p) => p.id === userB);
      expect(bob?.active_task_id).toBe(taskId2);

      // 4. Subtasks of task 1 are cascaded
      expect(snapshot.subtasks.find((s) => s.task_id === taskId1)).toBeUndefined();

      // 5. Time logs of task 1 are cascaded
      expect(snapshot.time_logs.find((tl) => tl.task_id === taskId1)).toBeUndefined();

      // 6. Comments and attachments of task 1 are cascaded
      expect(snapshot.task_comments.find((tc) => tc.task_id === taskId1)).toBeUndefined();
      expect(snapshot.task_attachments.find((ta) => ta.task_id === taskId1)).toBeUndefined();

      // 7. Notifications pointing to task 1 are cascaded
      expect(snapshot.notifications.find((n) => n.related_task_id === taskId1)).toBeUndefined();
    });
  });

  // ==========================================================================
  // VECTOR 5: PROJECT CASCADE DELETION INTEGRITY
  // ==========================================================================
  describe('Vector 5: Project Level Cascade Deletion Integrity', () => {
    const adminId = 'admin-user-id';
    const doomedProj = 'proj-doomed-for-deletion';
    const survivingProj = 'proj-survivor';
    const userId = 'user-alice';

    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: adminId,
            email: 'admin@artlake.studio',
            full_name: 'Studio Admin',
            initials: 'SA',
            avatar_url: null,
            role: 'admin',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: userId,
            email: 'alice@artlake.studio',
            full_name: 'Alice',
            initials: 'AL',
            avatar_url: null,
            role: 'user',
            department: 'Tech Art',
            active_task_id: 'task-doomed-1', // active on doomed task!
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: doomedProj,
            name: 'Doomed Project',
            description: '',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
          {
            id: survivingProj,
            name: 'Surviving Project',
            description: '',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-doomed',
            project_id: doomedProj,
            user_email: 'alice@artlake.studio',
            user_id: userId,
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-surviving',
            project_id: survivingProj,
            user_email: 'alice@artlake.studio',
            user_id: userId,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 'task-doomed-1',
            project_id: doomedProj,
            title: 'Doomed Task 1',
            description: '',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#TechArt',
            assignee_id: userId,
            queue_order: 1,
            estimated_minutes: 60,
            logged_minutes: 10,
            due_date: null,
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'task-surviving-1',
            project_id: survivingProj,
            title: 'Surviving Task 1',
            description: '',
            status: 'not_started',
            priority: 'medium',
            department_tag: '#CoreDev',
            assignee_id: userId,
            queue_order: 1,
            estimated_minutes: 60,
            logged_minutes: 0,
            due_date: null,
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        subtasks: [
          {
            id: 'sub-doomed-1',
            task_id: 'task-doomed-1',
            title: 'Doomed Sub',
            is_completed: false,
            position: 1,
            created_at: new Date().toISOString(),
          },
        ],
        time_logs: [
          {
            id: 'tl-doomed-1',
            project_id: doomedProj,
            user_id: userId,
            task_id: 'task-doomed-1',
            started_at: new Date().toISOString(),
            ended_at: null,
            duration_seconds: 600,
            is_manual_edit: false,
            year_week: '2026-W45',
            created_at: new Date().toISOString(),
          },
        ],
        weekly_checks: [
          {
            id: 'wc-doomed-1',
            project_id: doomedProj,
            user_id: userId,
            year_week: '2026-W45',
            went_well: 'Nothing',
            obstacles: 'Everything',
            workload_feeling: '5',
            submitted_at: new Date().toISOString(),
          },
        ],
        notifications: [
          {
            id: 'notif-doomed-1',
            recipient_id: userId,
            project_id: doomedProj,
            type: 'assigned',
            message: 'Task assigned in doomed project',
            related_task_id: 'task-doomed-1',
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ],
      });
      mockSupabase.testUtils.setMockUser({ id: adminId, email: 'admin@artlake.studio', role: 'admin' });
    });

    it('cascades all children tables and nullifies profile active_task_id on project deletion', async () => {
      const delProj = await supabase.from('projects').delete().eq('id', doomedProj);
      expect(delProj.error).toBeNull();

      const snapshot = mockSupabase.testUtils.getSnapshot();

      // Doomed project & members gone
      expect(snapshot.projects.find((p) => p.id === doomedProj)).toBeUndefined();
      expect(snapshot.project_members.find((pm) => pm.project_id === doomedProj)).toBeUndefined();

      // Tasks and nested subtasks gone
      expect(snapshot.tasks.find((t) => t.id === 'task-doomed-1')).toBeUndefined();
      expect(snapshot.subtasks.find((s) => s.id === 'sub-doomed-1')).toBeUndefined();

      // Time logs & weekly checks gone
      expect(snapshot.time_logs.find((tl) => tl.project_id === doomedProj)).toBeUndefined();
      expect(snapshot.weekly_checks.find((wc) => wc.project_id === doomedProj)).toBeUndefined();

      // Notifications gone
      expect(snapshot.notifications.find((n) => n.project_id === doomedProj)).toBeUndefined();

      // Profile active task ID nullified
      const user = snapshot.profiles.find((p) => p.id === userId);
      expect(user?.active_task_id).toBeNull();

      // Surviving project untouched
      expect(snapshot.projects.find((p) => p.id === survivingProj)).toBeDefined();
      expect(snapshot.project_members.find((pm) => pm.project_id === survivingProj)).toBeDefined();
      expect(snapshot.tasks.find((t) => t.id === 'task-surviving-1')).toBeDefined();
    });
  });

  // ==========================================================================
  // VECTOR 6: RPC HELPER & PRIVILEGE MATRIX
  // ==========================================================================
  describe('Vector 6: RPC Functions & Authentication Context', () => {
    it('returns false for is_admin and is_project_member when unauthenticated', async () => {
      await supabase.auth.signOut();

      const adminRpc = await supabase.rpc('is_admin');
      expect(adminRpc.data).toBe(false);

      const memberRpc = await supabase.rpc('is_project_member', { p_project_id: 'any-id' });
      expect(memberRpc.data).toBe(false);
    });
  });
});
