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
    <div data-testid="context-harness">
      <div data-testid="probe-tasks-count">{tasks.tasks.length}</div>
      <div data-testid="probe-is-loading">{tasks.isLoading ? 'loading' : 'ready'}</div>
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

describe('Task Permissions CRUD Suite: Admin Creation (R2) & Universal Editing (R3)', () => {
  const adminUser = {
    id: 'user-admin-m6',
    email: 'admin.m6@artlake.studio',
    full_name: 'Admin Lead',
    role: 'admin' as const,
    department: '#CoreDev',
  };

  const regularUser = {
    id: 'user-artist-m6',
    email: 'artist.m6@artlake.studio',
    full_name: 'Artist User',
    role: 'user' as const,
    department: '#3DEnv',
  };

  const testProject = {
    id: 'project-m6-studio',
    name: 'ArtLake Milestone M6 Sprint',
    description: 'Progetto di produzione M6',
    created_by: adminUser.id,
    created_at: '2026-11-01T08:00:00Z',
  };

  const getSeedTask = (): TaskRow => ({
    id: 'task-initial-1',
    project_id: testProject.id,
    title: 'Creazione Shader Acqua Stilizzata',
    description: 'Shader graph HLSL con distorsione UV e schiuma per Unity 6 URP',
    status: 'in_progress',
    priority: 'high',
    department_tag: '#TechArt',
    assignee_id: regularUser.id,
    queue_order: 0,
    estimated_minutes: 480,
    logged_minutes: 120,
    due_date: '2026-11-10T18:00:00Z',
    start_date: '2026-11-05T09:00:00Z',
    blocker_reason: null,
    blocking_target: '3D Team',
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
          initials: 'AL',
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
          initials: 'AU',
          avatar_url: null,
          role: regularUser.role,
          department: regularUser.department,
          active_task_id: null,
          created_at: '2026-11-01T08:00:00Z',
        },
      ],
      projects: [testProject],
      project_members: [
        {
          id: 'pm-admin',
          project_id: testProject.id,
          user_id: adminUser.id,
          user_email: adminUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
        {
          id: 'pm-user',
          project_id: testProject.id,
          user_id: regularUser.id,
          user_email: regularUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
      ],
      tasks: [getSeedTask()],
    });
  });

  // ==========================================================================
  // SECTION 1: DATA LAYER & CONTEXT AUTHORIZATION
  // ==========================================================================
  describe('Data Layer & TaskContext Authorization (Defense-in-Depth)', () => {
    it('Admin can successfully create a task via TaskContext with all 10 domain properties', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
        expect(probe.tasks.tasks.length).toBe(1);
      });

      let res: any;
      await act(async () => {
        res = await probe.tasks.createTask({
          title: 'Nuova Task Admin M6',
          description: 'Descrizione completa con tutti i requisiti tecnici',
          priority: 'high',
          departmentTag: '#CoreGameplay',
          assigneeId: regularUser.id,
          estimatedMinutes: 300,
          startDate: '2026-11-06T09:00:00Z',
          dueDate: '2026-11-12T18:00:00Z',
          blockingTarget: 'Level Design',
          blockerReason: null,
          status: 'not_started',
        });
      });

      expect(res.error).toBeNull();
      expect(res.data).not.toBeNull();
      expect(res.data?.title).toBe('Nuova Task Admin M6');
      expect(res.data?.priority).toBe('high');
      expect(res.data?.departmentTag).toBe('#CoreGameplay');
      expect(res.data?.assigneeId).toBe(regularUser.id);
      expect(res.data?.estimatedMinutes).toBe(300);
      expect(res.data?.blockingTarget).toBe('Level Design');

      // Verify state was refreshed
      await waitFor(() => {
        expect(probe.tasks.tasks.length).toBe(2);
      });
    });

    it('Non-admin user calling createTask in TaskContext is rejected with permission error', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
        expect(probe.tasks.tasks.length).toBe(1);
      });

      let res: any;
      await act(async () => {
        res = await probe.tasks.createTask({
          title: 'Tentativo Task da User',
          priority: 'low',
          departmentTag: '#Audio',
        });
      });

      expect(res.data).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.message).toContain('Permission denied: only admins can create tasks');
      expect(probe.tasks.tasks.length).toBe(1);
    });

    it('Non-admin user calling direct supabase.from("tasks").insert(...) is rejected with 42501', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);

      const { data, error } = await supabase.from('tasks').insert({
        project_id: testProject.id,
        title: 'Direct SQL Injection Attempt',
        description: 'Bypassing frontend context',
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(error?.message).toContain('only admins can create tasks');
    });

    it('Universal Task Editing: Non-admin user can update task properties via TaskContext', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
        expect(probe.tasks.tasks.length).toBe(1);
      });

      let res: any;
      await act(async () => {
        res = await probe.tasks.updateTask('task-initial-1', {
          title: 'Titolo Aggiornato da User',
          description: 'Descrizione modificata dal membro del team',
          priority: 'low',
          departmentTag: '#3DEnv',
          estimatedMinutes: 600,
          blockingTarget: 'VFX Team',
          status: 'blocked',
          blockerReason: 'Mancanza texture ad alta risoluzione',
        });
      });

      expect(res.error).toBeNull();
      expect(res.data).not.toBeNull();
      expect(res.data?.title).toBe('Titolo Aggiornato da User');
      expect(res.data?.priority).toBe('low');
      expect(res.data?.departmentTag).toBe('#3DEnv');
      expect(res.data?.estimatedMinutes).toBe(600);
      expect(res.data?.blockingTarget).toBe('VFX Team');
      expect(res.data?.status).toBe('blocked');
      expect(res.data?.blockerReason).toBe('Mancanza texture ad alta risoluzione');
    });

    it('Universal Task Editing: Admin can update task properties via TaskContext', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
      });

      let res: any;
      await act(async () => {
        res = await probe.tasks.updateTask('task-initial-1', {
          title: 'Titolo Aggiornato da Admin',
          priority: 'medium',
        });
      });

      expect(res.error).toBeNull();
      expect(res.data?.title).toBe('Titolo Aggiornato da Admin');
      expect(res.data?.priority).toBe('medium');
    });

    it('Universal Task Editing: Direct supabase.from("tasks").update(...) succeeds for non-admin on member project', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);

      const { data, error } = await supabase
        .from('tasks')
        .update({ title: 'Direct DB Update via Project Member' })
        .eq('id', 'task-initial-1')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('Direct DB Update via Project Member');
    });
  });

  // ==========================================================================
  // SECTION 2: UI VIEW INTEGRATION & ROLE VISIBILITY
  // ==========================================================================
  describe('UI View Integration & Role Permission Matrix', () => {
    it('Admin user sees "+ Nuova Task" in KanbanBoard and can create a task via TaskModal', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      const user = userEvent.setup();

      render(<App />);

      // Wait for app to finish loading and TopBar nav pill to appear
      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-kanban')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('nav-pill-kanban'));

      // Verify admin sees create button in Kanban
      await waitFor(() => {
        expect(screen.getByTestId('create-task-btn')).toBeInTheDocument();
      });

      // Click create task button
      await user.click(screen.getByTestId('create-task-btn'));

      // Verify TaskModal is opened with all 10 domain fields
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-title')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-description')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-priority')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-department')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-assignee')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-estimate')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-start-date')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-due-date')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-blocking-target')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-submit-btn')).toBeInTheDocument();

      // Fill form
      await user.type(screen.getByTestId('task-form-title'), 'Task Creata da Admin UI');
      await user.type(screen.getByTestId('task-form-description'), 'Dettagli di prova UI');
      await user.selectOptions(screen.getByTestId('task-form-priority'), 'high');
      await user.selectOptions(screen.getByTestId('task-form-department'), '#VFX');
      await user.clear(screen.getByTestId('task-form-estimate'));
      await user.type(screen.getByTestId('task-form-estimate'), '180');
      await user.type(screen.getByTestId('task-form-blocking-target'), 'Team Grafica');

      // Submit
      await user.click(screen.getByTestId('task-form-submit-btn'));

      // Modal closes and task appears in Kanban
      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
        expect(screen.getByText('Task Creata da Admin UI')).toBeInTheDocument();
      });
    });

    it('Admin user sees "+ Nuova Task" in AdminDashboard toolbar', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      const user = userEvent.setup();

      render(<App />);

      // Switch to Admin Dashboard
      await waitFor(() => {
        expect(screen.getByTestId('role-btn-admin')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('role-btn-admin'));

      await waitFor(() => {
        expect(screen.getByTestId('admin-create-task-btn')).toBeInTheDocument();
      });

      // Opening modal from AdminDashboard works
      await user.click(screen.getByTestId('admin-create-task-btn'));
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();

      // Cancel button closes it
      await user.click(screen.getByTestId('task-form-cancel-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
      });
    });

    it('Regular user ("user" role) strictly does NOT see creation buttons anywhere', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();

      render(<App />);

      // In UserDashboard: no create task button
      await waitFor(() => {
        expect(screen.getByTestId('hero-card')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('create-task-btn')).toBeNull();
      expect(screen.queryByTestId('admin-create-task-btn')).toBeNull();

      // Switch to Kanban
      await user.click(screen.getByTestId('nav-pill-kanban'));
      await waitFor(() => {
        expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
      });
      // Creation button must be completely absent from DOM
      expect(screen.queryByTestId('create-task-btn')).toBeNull();

      // Switch to Gantt
      await user.click(screen.getByTestId('nav-pill-gantt'));
      await waitFor(() => {
        expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('create-task-btn')).toBeNull();
    });

    it('Universal Task Editing in UserDashboard: Regular user can edit task via Hero card edit button', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('hero-card')).toBeInTheDocument();
      });

      const editBtn = screen.getByTestId('edit-hero-task-btn');
      expect(editBtn).toBeInTheDocument();
      await user.click(editBtn);

      // Verify modal opened in edit mode with current data
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-title')).toHaveValue('Creazione Shader Acqua Stilizzata');
      expect(screen.getByTestId('task-form-status')).toBeInTheDocument();

      // Update title and submit
      await user.clear(screen.getByTestId('task-form-title'));
      await user.type(screen.getByTestId('task-form-title'), 'Shader Acqua Aggiornato da Hero');
      await user.click(screen.getByTestId('task-form-submit-btn'));

      // Modal closes and Hero card reflects new title
      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
        expect(screen.getByTestId('active-task-title')).toHaveTextContent('Shader Acqua Aggiornato da Hero');
      });
    });

    it('Universal Task Editing in KanbanBoard: Both roles have kanban-edit button on cards', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-kanban')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('nav-pill-kanban'));

      await waitFor(() => {
        expect(screen.getByTestId('kanban-edit-task-initial-1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('kanban-edit-task-initial-1'));
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-title')).toHaveValue('Creazione Shader Acqua Stilizzata');

      // Close modal
      await user.click(screen.getByTestId('task-form-cancel-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
      });
    });

    it('Universal Task Editing in GanttView: Both roles have gantt-edit button on task rows', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-gantt')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('nav-pill-gantt'));

      await waitFor(() => {
        expect(screen.getByTestId('gantt-edit-task-initial-1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('gantt-edit-task-initial-1'));
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      expect(screen.getByTestId('task-form-title')).toHaveValue('Creazione Shader Acqua Stilizzata');

      await user.click(screen.getByTestId('task-form-cancel-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
      });
    });
  });

  // ==========================================================================
  // SECTION 3: FULL DOMAIN PROPERTY FIDELITY
  // ==========================================================================
  describe('Full Domain Property Fidelity across Create and Edit', () => {
    it('Persists all 10 domain properties exactly through creation and update lifecycle', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      let probe: ProbeState = null!;

      renderContextHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks.isLoading).toBe(false);
      });

      // 1. Create with full properties
      let createRes: any;
      await act(async () => {
        createRes = await probe.tasks.createTask({
          title: 'Task Completa 10 Proprietà',
          description: 'Test di fedeltà dati su tutte le colonne',
          priority: 'high',
          departmentTag: '#TechArt',
          assigneeId: regularUser.id,
          estimatedMinutes: 720,
          startDate: '2026-11-03T00:00:00Z',
          dueDate: '2026-11-15T00:00:00Z',
          blockingTarget: 'Level Designers',
          blockerReason: null,
          status: 'not_started',
        });
      });

      expect(createRes.error).toBeNull();
      const createdId = createRes.data!.id;

      // 2. Update all properties as regular user
      mockSupabase.testUtils.setMockUser(regularUser);

      let updateRes: any;
      await act(async () => {
        updateRes = await probe.tasks.updateTask(createdId, {
          title: 'Task Completa Aggiornata',
          description: 'Nuova descrizione dettagliata',
          priority: 'low',
          departmentTag: '#Audio',
          assigneeId: adminUser.id,
          estimatedMinutes: 180,
          startDate: '2026-11-04T00:00:00Z',
          dueDate: '2026-11-18T00:00:00Z',
          blockingTarget: 'Audio Engineers',
          blockerReason: 'In attesa di approvazione stem musicali',
          status: 'blocked',
        });
      });

      expect(updateRes.error).toBeNull();
      const updated = updateRes.data!;

      expect(updated.title).toBe('Task Completa Aggiornata');
      expect(updated.description).toBe('Nuova descrizione dettagliata');
      expect(updated.priority).toBe('low');
      expect(updated.departmentTag).toBe('#Audio');
      expect(updated.assigneeId).toBe(adminUser.id);
      expect(updated.estimatedMinutes).toBe(180);
      expect(updated.startDate).toBe('2026-11-04T00:00:00Z');
      expect(updated.dueDate).toBe('2026-11-18T00:00:00Z');
      expect(updated.blockingTarget).toBe('Audio Engineers');
      expect(updated.blockerReason).toBe('In attesa di approvazione stem musicali');
      expect(updated.status).toBe('blocked');
    });
  });
});
