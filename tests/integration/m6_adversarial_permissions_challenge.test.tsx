import React, { useEffect, useRef } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase } from '../../src/services/mockSupabase';
import { supabase } from '../../src/services/supabaseClient';
import { App } from '../../src/App';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { ProjectProvider, useProject } from '../../src/context/ProjectContext';
import { TimerProvider } from '../../src/context/TimerContext';
import { TaskProvider } from '../../src/context/TaskContext';
import { useTasks } from '../../src/hooks/useTasks';
import { TaskRow } from '../../src/types/models';

// ----------------------------------------------------------------------------
// HARNESS PROBE FOR CONTEXT TESTS
// ----------------------------------------------------------------------------
interface ProbeState {
  tasks: ReturnType<typeof useTasks>;
  project: ReturnType<typeof useProject>;
  auth: ReturnType<typeof useAuth>;
}

const ContextHarnessProbe: React.FC<{
  onProbe?: (probe: ProbeState) => void;
}> = ({ onProbe }) => {
  const tasks = useTasks();
  const project = useProject();
  const auth = useAuth();

  const probeRef = useRef<ProbeState>({ tasks, project, auth });
  probeRef.current = { tasks, project, auth };

  useEffect(() => {
    if (onProbe) {
      onProbe(probeRef.current);
    }
  });

  return (
    <div data-testid="adversarial-harness">
      <div data-testid="probe-tasks-count">{tasks.tasks.length}</div>
      <div data-testid="probe-is-loading">{tasks.isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="probe-is-admin">{project.isAdmin ? 'admin' : 'non-admin'}</div>
    </div>
  );
};

const renderContextHarness = (onProbe: (probe: ProbeState) => void) => {
  return render(
    <AuthProvider>
      <ProjectProvider>
        <TimerProvider>
          <TaskProvider>
            <ContextHarnessProbe onProbe={onProbe} />
          </TaskProvider>
        </TimerProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

describe('Adversarial Verification: Milestone M6 Boundaries & Permission Invariants', () => {
  const adminUser = {
    id: 'user-admin-adversary',
    email: 'admin.adversary@artlake.studio',
    full_name: 'Adversary Admin',
    role: 'admin' as const,
    department: '#CoreDev',
  };

  const regularUser = {
    id: 'user-regular-adversary',
    email: 'artist.adversary@artlake.studio',
    full_name: 'Adversary Artist',
    role: 'user' as const,
    department: '#TechArt',
  };

  const outsiderUser = {
    id: 'user-outsider-adversary',
    email: 'outsider.adversary@artlake.studio',
    full_name: 'Outsider User',
    role: 'user' as const,
    department: '#Audio',
  };

  const projectA = {
    id: 'project-adversarial-alpha',
    name: 'ArtLake Project Alpha',
    description: 'Progetto di produzione autorizzato Alpha',
    created_by: adminUser.id,
    created_at: '2026-11-01T08:00:00Z',
  };

  const projectB = {
    id: 'project-adversarial-beta-isolated',
    name: 'ArtLake Project Beta (Restricted)',
    description: 'Progetto isolato per test cross-project',
    created_by: adminUser.id,
    created_at: '2026-11-01T08:00:00Z',
  };

  const getSeedTaskA = (): TaskRow => ({
    id: 'task-alpha-101',
    project_id: projectA.id,
    title: 'Shader Acqua Dinamica',
    description: 'Shader graph URP iniziale',
    status: 'in_progress',
    priority: 'medium',
    department_tag: '#TechArt',
    assignee_id: regularUser.id,
    queue_order: 0,
    estimated_minutes: 240,
    logged_minutes: 60,
    due_date: '2026-11-15T18:00:00Z',
    start_date: '2026-11-05T09:00:00Z',
    blocker_reason: null,
    blocking_target: 'Lead Tech',
    review_output_link: null,
    created_at: '2026-11-05T08:00:00Z',
    updated_at: '2026-11-05T08:00:00Z',
  });

  const getSeedTaskB = (): TaskRow => ({
    id: 'task-beta-999',
    project_id: projectB.id,
    title: 'Secret Engine Architecture',
    description: 'Progetto Beta segreto riservato ad Admin',
    status: 'not_started',
    priority: 'high',
    department_tag: '#CoreDev',
    assignee_id: adminUser.id,
    queue_order: 0,
    estimated_minutes: 600,
    logged_minutes: 0,
    due_date: '2026-12-01T18:00:00Z',
    start_date: '2026-11-20T09:00:00Z',
    blocker_reason: null,
    blocking_target: null,
    review_output_link: null,
    created_at: '2026-11-05T08:00:00Z',
    updated_at: '2026-11-05T08:00:00Z',
  });

  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    localStorage.clear();
    vi.clearAllMocks();

    mockSupabase.testUtils.seedDatabase({
      profiles: [
        {
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.full_name,
          initials: 'AA',
          avatar_url: null,
          role: adminUser.role,
          department: adminUser.department,
          active_task_id: null,
          created_at: '2026-11-01T08:00:00Z',
        },
        {
          id: regularUser.id,
          email: regularUser.email,
          full_name: regularUser.full_name,
          initials: 'RA',
          avatar_url: null,
          role: regularUser.role,
          department: regularUser.department,
          active_task_id: null,
          created_at: '2026-11-01T08:00:00Z',
        },
        {
          id: outsiderUser.id,
          email: outsiderUser.email,
          full_name: outsiderUser.full_name,
          initials: 'OU',
          avatar_url: null,
          role: outsiderUser.role,
          department: outsiderUser.department,
          active_task_id: null,
          created_at: '2026-11-01T08:00:00Z',
        },
      ],
      projects: [projectA, projectB],
      project_members: [
        // Admin is member of both Project A and Project B
        {
          id: 'pm-admin-a',
          project_id: projectA.id,
          user_id: adminUser.id,
          user_email: adminUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
        {
          id: 'pm-admin-b',
          project_id: projectB.id,
          user_id: adminUser.id,
          user_email: adminUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
        // Regular user is ONLY a member of Project A
        {
          id: 'pm-user-a',
          project_id: projectA.id,
          user_id: regularUser.id,
          user_email: regularUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
      ],
      tasks: [getSeedTaskA(), getSeedTaskB()],
    });
  });

  // ==========================================================================
  // VECTOR 1: Malicious & Bypass Attempts by Non-Admin
  // ==========================================================================
  describe('Vector 1: Malicious & Bypass Attempts by Non-Admin', () => {
    it('1.1 Non-admin calling createTask directly is rejected with friendly authorization error', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
        expect(probe.project.isAdmin).toBe(false);
      });

      let result: any;
      await act(async () => {
        result = await probe.tasks.createTask({
          title: 'Illegitimate Non-Admin Task',
          description: 'Attempting creation without admin role',
        });
      });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toBe('Permission denied: only admins can create tasks');

      // Database integrity: task was NOT added to project A
      const dbTasks = mockSupabase.testUtils.getSnapshot().tasks;
      expect(dbTasks.some((t) => t.title === 'Illegitimate Non-Admin Task')).toBe(false);
    });

    it('1.2 Non-admin direct Supabase INSERT with full valid fields is rejected with 42501', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);

      const { data, error } = await supabase.from('tasks').insert({
        project_id: projectA.id,
        title: 'Direct Database Injection Attempt',
        description: 'Bypassing TaskContext frontend layer',
        status: 'not_started',
        priority: 'high',
        department_tag: '#TechArt',
        assignee_id: regularUser.id,
        estimated_minutes: 180,
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(error?.message).toContain('only admins can create tasks');

      const dbTasks = mockSupabase.testUtils.getSnapshot().tasks;
      expect(dbTasks.some((t) => t.title === 'Direct Database Injection Attempt')).toBe(false);
    });

    it('1.3 Non-admin direct Supabase INSERT with missing required fields is rejected with 42501', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);

      // Attempt insert with empty/missing properties
      const { data, error } = await supabase.from('tasks').insert({
        project_id: projectA.id,
        // missing title
      } as any);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('1.4 Non-admin direct Supabase INSERT with injected properties (role spoof, prototype keys) is rejected with 42501', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);

      const hostilePayload: any = {
        project_id: projectA.id,
        title: 'Hostile Injected Task',
        is_admin: true,
        role: 'admin',
        __proto__: { isAdmin: true },
        'drop table': 'true',
      };

      const { data, error } = await supabase.from('tasks').insert(hostilePayload);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(error?.message).toContain('only admins can create tasks');
    });

    it('1.5 Unauthenticated user direct Supabase INSERT fails with code 42501 (zero anon access)', async () => {
      mockSupabase.testUtils.setSession(null);

      const { data, error } = await supabase.from('tasks').insert({
        project_id: projectA.id,
        title: 'Unauthenticated Task',
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('1.6 Non-admin cannot elevate own role to admin in profiles table to gain task creation rights', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);

      // Attempt privilege escalation via profiles update
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', regularUser.id);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(error?.message).toContain('cannot alter role');

      // Verify profile role in database remains 'user'
      const prof = mockSupabase.testUtils.getSnapshot().profiles.find((p) => p.id === regularUser.id);
      expect(prof?.role).toBe('user');
    });

    it('1.7 Non-admin does NOT see creation buttons anywhere across UI views', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByTestId('login-gate')).toBeNull();
        expect(screen.getByTestId('topbar')).toBeInTheDocument();
      });

      // 1. Kanban view: "+ Nuova Task" creation button must NOT exist
      await user.click(screen.getByTestId('nav-pill-kanban'));
      await waitFor(() => {
        expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('create-task-btn')).toBeNull();

      // 2. Gantt view: creation button must NOT exist
      await user.click(screen.getByTestId('nav-pill-gantt'));
      await waitFor(() => {
        expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('create-task-btn')).toBeNull();

      // 3. User Dashboard view: creation button must NOT exist
      await user.click(screen.getByTestId('nav-pill-dashboard'));
      await waitFor(() => {
        expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('create-task-btn')).toBeNull();
      expect(screen.queryByTestId('admin-create-task-btn')).toBeNull();
    });
  });

  // ==========================================================================
  // VECTOR 2: Extreme Boundary Inputs on Admin Task Creation
  // ==========================================================================
  describe('Vector 2: Extreme Boundary Inputs on Admin Task Creation', () => {
    it('2.1 Rejects empty or whitespace-only task title', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
      });

      // Empty string
      const res1 = await probe.tasks.createTask({
        title: '',
        description: 'No title test',
      });
      expect(res1.data).toBeNull();
      expect(res1.error?.message).toBe('Task title is required');

      // Whitespace string
      const res2 = await probe.tasks.createTask({
        title: '    \t\n  ',
        description: 'Whitespace title test',
      });
      expect(res2.data).toBeNull();
      expect(res2.error?.message).toBe('Task title is required');
    });

    it('2.2 Accepts massive 10,000 character description without truncation or memory corruption', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
      });

      const hugeDescription = 'Alpha-Omega-Stress-'.repeat(600); // 11,400 characters > 10,000
      expect(hugeDescription.length).toBeGreaterThan(10000);

      let res: any;
      await act(async () => {
        res = await probe.tasks.createTask({
          title: 'Stress Test: Massive Description',
          description: hugeDescription,
          priority: 'high',
          departmentTag: '#CoreDev',
        });
      });

      expect(res.error).toBeNull();
      expect(res.data).not.toBeNull();
      expect(res.data.description.length).toBe(hugeDescription.length);
      expect(res.data.description).toBe(hugeDescription);

      // Verify in DB state
      const dbTask = mockSupabase.testUtils.getSnapshot().tasks.find((t) => t.id === res.data.id);
      expect(dbTask?.description).toBe(hugeDescription);
    });

    it('2.3 Handles extreme values for estimatedMinutes (negative, zero, huge)', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
      });

      // Negative minutes
      let resNegative: any;
      await act(async () => {
        resNegative = await probe.tasks.createTask({
          title: 'Negative Minutes Task',
          estimatedMinutes: -120,
        });
      });
      expect(resNegative.error).toBeNull();
      expect(resNegative.data.estimatedMinutes).toBe(-120);

      // Massive minutes
      let resHuge: any;
      await act(async () => {
        resHuge = await probe.tasks.createTask({
          title: 'Huge Minutes Task',
          estimatedMinutes: 999999999,
        });
      });
      expect(resHuge.error).toBeNull();
      expect(resHuge.data.estimatedMinutes).toBe(999999999);
    });

    it('2.4 Handles extreme and null dates (epoch 1970, future 2099, null)', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
      });

      // Null dates
      let resNull: any;
      await act(async () => {
        resNull = await probe.tasks.createTask({
          title: 'Null Dates Task',
          startDate: null,
          dueDate: null,
        });
      });
      expect(resNull.error).toBeNull();
      expect(resNull.data.startDate).toBeNull();
      expect(resNull.data.dueDate).toBeNull();

      // Epoch & Future dates
      let resExtreme: any;
      await act(async () => {
        resExtreme = await probe.tasks.createTask({
          title: 'Boundary Dates Task',
          startDate: '1970-01-01T00:00:00.000Z',
          dueDate: '2099-12-31T23:59:59.000Z',
        });
      });
      expect(resExtreme.error).toBeNull();
      expect(resExtreme.data.startDate).toBe('1970-01-01T00:00:00.000Z');
      expect(resExtreme.data.dueDate).toBe('2099-12-31T23:59:59.000Z');
    });

    it('2.5 Handles unusual / custom department tags safely', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
      });

      let resTag: any;
      await act(async () => {
        resTag = await probe.tasks.createTask({
          title: 'Unusual Department Task',
          departmentTag: '#CustomVFXSpecialist' as any,
        });
      });
      expect(resTag.error).toBeNull();
      expect(resTag.data.departmentTag).toBe('#CustomVFXSpecialist');
    });

    it('2.6 Preserves hostile strings (XSS payloads, SQL injections, Emojis) without crash or injection', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
      });

      const xssTitle = '<script>window.alert("xss")</script> 🚀🔥';
      const sqliDescription = "'; DROP TABLE tasks; SELECT * FROM profiles WHERE '1'='1";

      let resInjection: any;
      await act(async () => {
        resInjection = await probe.tasks.createTask({
          title: xssTitle,
          description: sqliDescription,
          blockingTarget: '"><img src=x onerror=alert(1)>',
        });
      });

      expect(resInjection.error).toBeNull();
      expect(resInjection.data.title).toBe(xssTitle);
      expect(resInjection.data.description).toBe(sqliDescription);
      expect(resInjection.data.blockingTarget).toBe('"><img src=x onerror=alert(1)>');

      const dbRow = mockSupabase.testUtils.getSnapshot().tasks.find((t) => t.id === resInjection.data.id);
      expect(dbRow?.title).toBe(xssTitle);
      expect(dbRow?.description).toBe(sqliDescription);
    });
  });

  // ==========================================================================
  // VECTOR 3: Universal Task Editing & Project Membership Isolation
  // ==========================================================================
  describe('Vector 3: Universal Task Editing & Project Membership Isolation', () => {
    it('3.1 Regular user (non-admin) can universally edit all domain properties of existing project task', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
        expect(probe.tasks.tasks.length).toBeGreaterThan(0);
      });

      const targetId = 'task-alpha-101';

      let updateRes: any;
      await act(async () => {
        updateRes = await probe.tasks.updateTask(targetId, {
          title: 'Shader Acqua Dinamica v2 (Refactored)',
          description: 'Descrizione aggiornata da artista non-admin',
          priority: 'high',
          departmentTag: '#VFX',
          assigneeId: adminUser.id, // reassign to admin
          estimatedMinutes: 360,
          startDate: '2026-11-06T00:00:00Z',
          dueDate: '2026-11-20T00:00:00Z',
          blockingTarget: 'Audio Director',
          blockerReason: 'In attesa di sfx audio',
          status: 'blocked',
        });
      });

      expect(updateRes.error).toBeNull();
      expect(updateRes.data).not.toBeNull();
      expect(updateRes.data.title).toBe('Shader Acqua Dinamica v2 (Refactored)');
      expect(updateRes.data.description).toBe('Descrizione aggiornata da artista non-admin');
      expect(updateRes.data.priority).toBe('high');
      expect(updateRes.data.departmentTag).toBe('#VFX');
      expect(updateRes.data.assigneeId).toBe(adminUser.id);
      expect(updateRes.data.estimatedMinutes).toBe(360);
      expect(updateRes.data.blockingTarget).toBe('Audio Director');
      expect(updateRes.data.blockerReason).toBe('In attesa di sfx audio');
      expect(updateRes.data.status).toBe('blocked');

      // Verify in DB state
      const dbTask = mockSupabase.testUtils.getSnapshot().tasks.find((t) => t.id === targetId);
      expect(dbTask?.title).toBe('Shader Acqua Dinamica v2 (Refactored)');
      expect(dbTask?.status).toBe('blocked');
      expect(dbTask?.priority).toBe('high');
    });

    it('3.2 Non-member is strictly PREVENTED from updating tasks in foreign projects (42501)', async () => {
      // regularUser is a member of Project A, but NOT Project B
      mockSupabase.testUtils.setMockUser(regularUser);

      // Attempt to modify task-beta-999 (which belongs to Project B)
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: 'Unauthorized Intrusion into Project Beta',
          priority: 'low',
        })
        .eq('id', 'task-beta-999');

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(error?.message).toContain('permission denied for tasks');

      // Verify Task B was NOT changed in database
      const dbTaskB = mockSupabase.testUtils.getSnapshot().tasks.find((t) => t.id === 'task-beta-999');
      expect(dbTaskB?.title).toBe('Secret Engine Architecture');
      expect(dbTaskB?.priority).toBe('high');
    });

    it('3.3 Non-admin is strictly PREVENTED from deleting tasks (42501), while admin can delete', async () => {
      // Regular user tries to delete task-alpha-101
      mockSupabase.testUtils.setMockUser(regularUser);

      const { data: deleteData, error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', 'task-alpha-101');

      expect(deleteData).toBeNull();
      expect(deleteError).not.toBeNull();
      expect(deleteError?.code).toBe('42501');
      expect(deleteError?.message).toContain('permission denied for tasks');

      // Verify task still exists in DB
      let dbTasks = mockSupabase.testUtils.getSnapshot().tasks;
      expect(dbTasks.some((t) => t.id === 'task-alpha-101')).toBe(true);

      // Admin user can delete task
      mockSupabase.testUtils.setMockUser(adminUser);
      const { error: adminDeleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', 'task-alpha-101');

      expect(adminDeleteError).toBeNull();
      dbTasks = mockSupabase.testUtils.getSnapshot().tasks;
      expect(dbTasks.some((t) => t.id === 'task-alpha-101')).toBe(false);
    });

    it('3.4 Outsider (non-member of any project) cannot update or create tasks in any project', async () => {
      mockSupabase.testUtils.setMockUser(outsiderUser);

      // Creation attempt
      const { error: createError } = await supabase.from('tasks').insert({
        project_id: projectA.id,
        title: 'Outsider Task',
      });
      expect(createError?.code).toBe('42501');

      // Update attempt on Project A
      const { error: updateErrorA } = await supabase
        .from('tasks')
        .update({ title: 'Hacked Alpha' })
        .eq('id', 'task-alpha-101');
      expect(updateErrorA?.code).toBe('42501');

      // Update attempt on Project B
      const { error: updateErrorB } = await supabase
        .from('tasks')
        .update({ title: 'Hacked Beta' })
        .eq('id', 'task-beta-999');
      expect(updateErrorB?.code).toBe('42501');
    });
  });
});
