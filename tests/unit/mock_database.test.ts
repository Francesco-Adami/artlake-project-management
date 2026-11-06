import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';
import { mockSupabase } from '@/services/mockSupabase';

describe('Hermetic Database & RLS Security Suite', () => {
  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
  });

  describe('Suite 1: Zero Anonymous Access (RLS Enforcement)', () => {
    beforeEach(async () => {
      await supabase.auth.signOut();
    });

    it('should return 0 rows for unauthenticated queries on tasks, projects, and profiles', async () => {
      // Seed some data directly into the database
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'u1',
            email: 'admin@artlake.studio',
            full_name: 'Admin User',
            initials: 'AU',
            avatar_url: null,
            role: 'admin',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: 'p1',
            name: 'Secret Project',
            description: 'Confidential',
            created_by: 'u1',
            created_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 't1',
            project_id: 'p1',
            title: 'Top Secret Feature',
            description: '',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#CoreDev',
            assignee_id: 'u1',
            queue_order: 1,
            estimated_minutes: 100,
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
      });

      const tasksRes = await supabase.from('tasks').select('*');
      expect(tasksRes.error).toBeNull();
      expect(tasksRes.data).toEqual([]);

      const projectsRes = await supabase.from('projects').select('*');
      expect(projectsRes.error).toBeNull();
      expect(projectsRes.data).toEqual([]);

      const profilesRes = await supabase.from('profiles').select('*');
      expect(profilesRes.error).toBeNull();
      expect(profilesRes.data).toEqual([]);
    });

    it('should reject unauthenticated insert, update, and delete with RLS error code 42501', async () => {
      const insertRes = await supabase.from('tasks').insert({
        project_id: 'p1',
        title: 'Hacked Task',
        department_tag: '#CoreDev',
      });
      expect(insertRes.error).not.toBeNull();
      expect(insertRes.error?.code).toBe('42501');

      const updateRes = await supabase
        .from('tasks')
        .update({ title: 'Modified' })
        .eq('id', 't1');
      expect(updateRes.error).not.toBeNull();
      expect(updateRes.error?.code).toBe('42501');

      const deleteRes = await supabase.from('tasks').delete().eq('id', 't1');
      expect(deleteRes.error).not.toBeNull();
      expect(deleteRes.error?.code).toBe('42501');
    });
  });

  describe('Suite 2: Multi-Project Tenant Isolation', () => {
    const project1Id = 'proj-alpha';
    const project2Id = 'proj-beta';
    const userAId = 'user-a';
    const userBId = 'user-b';

    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: userAId,
            email: 'alice@artlake.studio',
            full_name: 'Alice Artist',
            initials: 'AA',
            avatar_url: null,
            role: 'user',
            department: '3D Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: userBId,
            email: 'bob@artlake.studio',
            full_name: 'Bob Builder',
            initials: 'BB',
            avatar_url: null,
            role: 'user',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: project1Id,
            name: 'Project Alpha',
            description: 'Alpha workspace',
            created_by: userAId,
            created_at: new Date().toISOString(),
          },
          {
            id: project2Id,
            name: 'Project Beta',
            description: 'Beta workspace',
            created_by: userBId,
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-1',
            project_id: project1Id,
            user_email: 'alice@artlake.studio',
            user_id: userAId,
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-2',
            project_id: project2Id,
            user_email: 'bob@artlake.studio',
            user_id: userBId,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 'task-a1',
            project_id: project1Id,
            title: 'Task for Alpha Only',
            description: '',
            status: 'not_started',
            priority: 'medium',
            department_tag: '#3DEnv',
            assignee_id: userAId,
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
          {
            id: 'task-b1',
            project_id: project2Id,
            title: 'Task for Beta Only',
            description: '',
            status: 'not_started',
            priority: 'high',
            department_tag: '#CoreDev',
            assignee_id: userBId,
            queue_order: 1,
            estimated_minutes: 120,
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
      });
    });

    it('should strictly isolate project and task visibility per user membership', async () => {
      // Authenticate as User A
      mockSupabase.testUtils.setMockUser({
        id: userAId,
        email: 'alice@artlake.studio',
        role: 'user',
        full_name: 'Alice Artist',
      });

      const userAProjects = await supabase.from('projects').select('*');
      expect(userAProjects.data).toHaveLength(1);
      expect(userAProjects.data?.[0].id).toBe(project1Id);

      const userATasks = await supabase.from('tasks').select('*');
      expect(userATasks.data).toHaveLength(1);
      expect(userATasks.data?.[0].id).toBe('task-a1');

      // User A attempts to insert task into Project Beta (not member)
      const invalidInsert = await supabase.from('tasks').insert({
        project_id: project2Id,
        title: 'Intrusion Task',
        department_tag: '#CoreDev',
      });
      expect(invalidInsert.error).not.toBeNull();
      expect(invalidInsert.error?.code).toBe('42501');

      // Authenticate as User B
      mockSupabase.testUtils.setMockUser({
        id: userBId,
        email: 'bob@artlake.studio',
        role: 'user',
        full_name: 'Bob Builder',
      });

      const userBProjects = await supabase.from('projects').select('*');
      expect(userBProjects.data).toHaveLength(1);
      expect(userBProjects.data?.[0].id).toBe(project2Id);

      const userBTasks = await supabase.from('tasks').select('*');
      expect(userBTasks.data).toHaveLength(1);
      expect(userBTasks.data?.[0].id).toBe('task-b1');
    });
  });

  describe('Suite 3: Role Matrix & Admin Privileges', () => {
    const adminId = 'admin-user';
    const regularUserId = 'regular-user';
    const projectId = 'proj-main';

    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: adminId,
            email: 'admin@artlake.studio',
            full_name: 'Studio Producer',
            initials: 'SP',
            avatar_url: null,
            role: 'admin',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: regularUserId,
            email: 'user@artlake.studio',
            full_name: 'Studio Artist',
            initials: 'SA',
            avatar_url: null,
            role: 'user',
            department: 'Tech Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: projectId,
            name: 'Studio Main',
            description: 'Workspace',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-reg',
            project_id: projectId,
            user_email: 'user@artlake.studio',
            user_id: regularUserId,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 'task-admin-1',
            project_id: projectId,
            title: 'Critical Task',
            description: '',
            status: 'not_started',
            priority: 'high',
            department_tag: '#CoreDev',
            assignee_id: regularUserId,
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
      });
    });

    it('should deny regular users from creating or deleting projects and deleting tasks', async () => {
      mockSupabase.testUtils.setMockUser({
        id: regularUserId,
        email: 'user@artlake.studio',
        role: 'user',
      });

      // Regular user cannot create project
      const insertProj = await supabase.from('projects').insert({
        name: 'Unauthorized Project',
        created_by: regularUserId,
      });
      expect(insertProj.error?.code).toBe('42501');

      // Regular user cannot delete project
      const deleteProj = await supabase.from('projects').delete().eq('id', projectId);
      expect(deleteProj.error?.code).toBe('42501');

      // Regular user cannot delete task
      const deleteTask = await supabase.from('tasks').delete().eq('id', 'task-admin-1');
      expect(deleteTask.error?.code).toBe('42501');

      // Regular user cannot invite members
      const inviteMember = await supabase.from('project_members').insert({
        project_id: projectId,
        user_email: 'newuser@artlake.studio',
      });
      expect(inviteMember.error?.code).toBe('42501');
    });

    it('should allow admin full CRUD permissions across projects, members, and tasks', async () => {
      mockSupabase.testUtils.setMockUser({
        id: adminId,
        email: 'admin@artlake.studio',
        role: 'admin',
      });

      // Admin creates project
      const newProj = await supabase.from('projects').insert({
        id: 'proj-new',
        name: 'Admin Created Project',
        created_by: adminId,
      });
      expect(newProj.error).toBeNull();

      // Admin invites member
      const inviteRes = await supabase.from('project_members').insert({
        project_id: 'proj-new',
        user_email: 'newinvitee@artlake.studio',
      });
      expect(inviteRes.error).toBeNull();

      // Admin deletes task
      const delTaskRes = await supabase.from('tasks').delete().eq('id', 'task-admin-1');
      expect(delTaskRes.error).toBeNull();

      // Admin deletes project
      const delProjRes = await supabase.from('projects').delete().eq('id', 'proj-new');
      expect(delProjRes.error).toBeNull();
    });
  });

  describe('Suite 4: Pre-Login Invitation Auto-Binding Trigger (handle_new_user)', () => {
    it('should automatically link pending invitation in project_members when a new user signs in', async () => {
      const projectId = 'proj-invite-test';

      // 1. Pre-existing project with an invitation for "artist@artlake.studio"
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: projectId,
            name: 'Invite Test Project',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'invite-1',
            project_id: projectId,
            user_email: 'artist@artlake.studio',
            user_id: null, // Pending invite!
            invited_at: new Date().toISOString(),
          },
        ],
      });

      // 2. User signs in with mixed case email and full name
      const newUser = {
        id: 'new-user-123',
        email: 'Artist@ArtLake.Studio',
        user_metadata: {
          full_name: 'Elena Rostova',
          role: 'user' as const,
        },
      };

      mockSupabase.testUtils.handleNewUserTrigger(newUser);
      mockSupabase.testUtils.setSession({
        access_token: 'token-elena',
        token_type: 'bearer',
        expires_in: 3600,
        user: newUser,
      });

      // 3. Verify profile was created with proper initials
      const snapshot = mockSupabase.testUtils.getSnapshot();
      const profile = snapshot.profiles.find((p) => p.id === 'new-user-123');
      expect(profile).toBeDefined();
      expect(profile?.full_name).toBe('Elena Rostova');
      expect(profile?.initials).toBe('ER');
      expect(profile?.role).toBe('user');

      // 4. Verify project_members was auto-bound to new-user-123
      const memberRecord = snapshot.project_members.find((pm) => pm.id === 'invite-1');
      expect(memberRecord?.user_id).toBe('new-user-123');

      // 5. Verify Elena can now query Project
      const queryRes = await supabase.from('projects').select('*');
      expect(queryRes.error).toBeNull();
      expect(queryRes.data).toHaveLength(1);
      expect(queryRes.data?.[0].id).toBe(projectId);
    });
  });

  describe('Suite 5: Foreign Keys, Cascades & Relational Constraints', () => {
    it('should nullify profile active_task_id when active task is deleted (ON DELETE SET NULL)', async () => {
      const adminId = 'admin-1';
      const userId = 'artist-1';
      const taskId = 'task-to-delete';

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: adminId,
            email: 'admin@artlake.studio',
            full_name: 'Admin',
            initials: 'AD',
            avatar_url: null,
            role: 'admin',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: userId,
            email: 'artist@artlake.studio',
            full_name: 'Artist',
            initials: 'AR',
            avatar_url: null,
            role: 'user',
            department: 'Tech Art',
            active_task_id: taskId,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: 'proj-1',
            name: 'P1',
            description: '',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: taskId,
            project_id: 'proj-1',
            title: 'Active Hero Task',
            description: '',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#TechArt',
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
      });

      // Admin deletes the task
      mockSupabase.testUtils.setMockUser({ id: adminId, email: 'admin@artlake.studio', role: 'admin' });
      const delRes = await supabase.from('tasks').delete().eq('id', taskId);
      expect(delRes.error).toBeNull();

      // Check artist profile active_task_id is now null
      const snapshot = mockSupabase.testUtils.getSnapshot();
      const updatedArtist = snapshot.profiles.find((p) => p.id === userId);
      expect(updatedArtist?.active_task_id).toBeNull();
    });

    it('should cascade delete related tasks, subtasks, and time logs when a project is deleted', async () => {
      const adminId = 'admin-1';
      const projId = 'cascade-proj';

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: adminId,
            email: 'admin@artlake.studio',
            full_name: 'Admin',
            initials: 'AD',
            avatar_url: null,
            role: 'admin',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: projId,
            name: 'Doomed Project',
            description: '',
            created_by: adminId,
            created_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 't-doomed',
            project_id: projId,
            title: 'Doomed Task',
            description: '',
            status: 'not_started',
            priority: 'low',
            department_tag: '#CoreDev',
            assignee_id: null,
            queue_order: 1,
            estimated_minutes: 10,
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
            id: 'sub-doomed',
            task_id: 't-doomed',
            title: 'Subtask',
            is_completed: false,
            position: 1,
            created_at: new Date().toISOString(),
          },
        ],
        time_logs: [
          {
            id: 'tl-doomed',
            project_id: projId,
            user_id: adminId,
            task_id: 't-doomed',
            started_at: new Date().toISOString(),
            ended_at: null,
            duration_seconds: 120,
            is_manual_edit: false,
            year_week: '2026-W45',
            created_at: new Date().toISOString(),
          },
        ],
      });

      mockSupabase.testUtils.setMockUser({ id: adminId, email: 'admin@artlake.studio', role: 'admin' });
      const delProj = await supabase.from('projects').delete().eq('id', projId);
      expect(delProj.error).toBeNull();

      const snapshot = mockSupabase.testUtils.getSnapshot();
      expect(snapshot.projects.find((p) => p.id === projId)).toBeUndefined();
      expect(snapshot.tasks.find((t) => t.id === 't-doomed')).toBeUndefined();
      expect(snapshot.subtasks.find((s) => s.id === 'sub-doomed')).toBeUndefined();
      expect(snapshot.time_logs.find((tl) => tl.id === 'tl-doomed')).toBeUndefined();
    });

    it('should enforce unique constraint on project_members (project_id, user_email)', async () => {
      const adminId = 'admin-1';
      mockSupabase.testUtils.setMockUser({ id: adminId, email: 'admin@artlake.studio', role: 'admin' });

      // First invite succeeds
      const first = await supabase.from('project_members').insert({
        project_id: 'p1',
        user_email: 'unique@artlake.studio',
      });
      expect(first.error).toBeNull();

      // Duplicate invite fails with 23505
      const duplicate = await supabase.from('project_members').insert({
        project_id: 'p1',
        user_email: 'Unique@ArtLake.Studio', // case insensitive check
      });
      expect(duplicate.error).not.toBeNull();
      expect(duplicate.error?.code).toBe('23505');
    });

    it('should enforce unique constraint on weekly_checks (user_id, project_id, year_week)', async () => {
      const userId = 'artist-1';
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: userId,
            email: 'artist@artlake.studio',
            full_name: 'Artist',
            initials: 'AR',
            avatar_url: null,
            role: 'user',
            department: 'Tech Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: 'p1',
            name: 'P1',
            description: '',
            created_by: userId,
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-1',
            project_id: 'p1',
            user_email: 'artist@artlake.studio',
            user_id: userId,
            invited_at: new Date().toISOString(),
          },
        ],
      });

      mockSupabase.testUtils.setMockUser({ id: userId, email: 'artist@artlake.studio', role: 'user' });

      // First submission
      const first = await supabase.from('weekly_checks').insert({
        project_id: 'p1',
        user_id: userId,
        year_week: '2026-W45',
        went_well: 'Great progress',
        obstacles: 'None',
        workload_feeling: '3',
      });
      expect(first.error).toBeNull();

      // Duplicate submission
      const duplicate = await supabase.from('weekly_checks').insert({
        project_id: 'p1',
        user_id: userId,
        year_week: '2026-W45',
        went_well: 'Another check',
        obstacles: 'Conflict',
        workload_feeling: '4',
      });
      expect(duplicate.error).not.toBeNull();
      expect(duplicate.error?.code).toBe('23505');
    });
  });

  describe('Suite 6: RPC Helper Functions', () => {
    it('should correctly evaluate is_admin() and is_project_member() RPCs', async () => {
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'admin-1',
            email: 'admin@artlake.studio',
            full_name: 'Admin',
            initials: 'AD',
            avatar_url: null,
            role: 'admin',
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: 'user-1',
            email: 'user@artlake.studio',
            full_name: 'User',
            initials: 'US',
            avatar_url: null,
            role: 'user',
            department: 'Tech Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: 'proj-rpc',
            name: 'RPC Proj',
            description: '',
            created_by: 'admin-1',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-rpc',
            project_id: 'proj-rpc',
            user_email: 'user@artlake.studio',
            user_id: 'user-1',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      // User 1
      mockSupabase.testUtils.setMockUser({ id: 'user-1', email: 'user@artlake.studio', role: 'user' });
      const userAdminRpc = await supabase.rpc('is_admin');
      expect(userAdminRpc.data).toBe(false);

      const userMemberRpc = await supabase.rpc('is_project_member', { p_project_id: 'proj-rpc' });
      expect(userMemberRpc.data).toBe(true);

      const userNotMemberRpc = await supabase.rpc('is_project_member', { p_project_id: 'proj-other' });
      expect(userNotMemberRpc.data).toBe(false);

      // Admin 1
      mockSupabase.testUtils.setMockUser({ id: 'admin-1', email: 'admin@artlake.studio', role: 'admin' });
      const adminRpc = await supabase.rpc('is_admin');
      expect(adminRpc.data).toBe(true);
    });
  });
});
