import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase } from '../../src/services/mockSupabase';
import { supabase } from '../../src/services/supabaseClient';
import { App } from '../../src/App';
import { TaskRow } from '../../src/types/models';

describe('Empirical Challenger: Multi-View Synchronization & 10 Domain Properties Suite', () => {
  const adminUser = {
    id: 'user-admin-challenger',
    email: 'admin.challenger@artlake.studio',
    full_name: 'Lead Director',
    role: 'admin' as const,
    department: '#CoreDev',
  };

  const regularUser = {
    id: 'user-regular-challenger',
    email: 'artist.challenger@artlake.studio',
    full_name: 'Lead 3D Artist',
    role: 'user' as const,
    department: '#3DEnv',
  };

  const testProject = {
    id: 'project-challenger-m6',
    name: 'ArtLake Challenger Testbed',
    description: 'Adversarial multi-view verification project',
    created_by: adminUser.id,
    created_at: '2026-11-01T08:00:00Z',
  };

  const getSeedTasks = (): TaskRow[] => [
    {
      id: 'task-hero-active',
      project_id: testProject.id,
      title: 'Hero Task Alpha',
      description: 'Initial hero task description for testing',
      status: 'in_progress',
      priority: 'medium',
      department_tag: '#TechArt',
      assignee_id: regularUser.id,
      queue_order: 0,
      estimated_minutes: 180,
      logged_minutes: 30,
      due_date: '2026-11-12T18:00:00Z',
      start_date: '2026-11-05T09:00:00Z',
      blocker_reason: null,
      blocking_target: null,
      review_output_link: null,
      created_at: '2026-11-05T08:00:00Z',
      updated_at: '2026-11-05T08:00:00Z',
    },
    {
      id: 'task-queued-beta',
      project_id: testProject.id,
      title: 'Queued Task Beta',
      description: 'Secondary task waiting in queue',
      status: 'not_started',
      priority: 'low',
      department_tag: '#CoreGameplay',
      assignee_id: regularUser.id,
      queue_order: 1,
      estimated_minutes: 120,
      logged_minutes: 0,
      due_date: '2026-11-15T18:00:00Z',
      start_date: '2026-11-08T09:00:00Z',
      blocker_reason: null,
      blocking_target: null,
      review_output_link: null,
      created_at: '2026-11-05T08:00:00Z',
      updated_at: '2026-11-05T08:00:00Z',
    },
  ];

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
          initials: 'LD',
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
          initials: 'LA',
          avatar_url: null,
          role: regularUser.role,
          department: regularUser.department,
          active_task_id: 'task-hero-active',
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
      tasks: getSeedTasks(),
    });
  });

  // ==========================================================================
  // VECTOR 1: UserDashboard -> KanbanBoard & GanttView Cross-View Synchronization
  // ==========================================================================
  describe('Vector 1: UserDashboard -> KanbanBoard & GanttView Sync', () => {
    it('Edits executed in UserDashboard by a regular user propagate reactively to KanbanBoard and GanttView', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();

      render(<App />);

      // Verify UserDashboard loaded
      await waitFor(() => {
        expect(screen.getByTestId('hero-card')).toBeInTheDocument();
        expect(screen.getByTestId('active-task-title')).toHaveTextContent('Hero Task Alpha');
      });

      // 1. Trigger Edit from UserDashboard Hero Card
      const editHeroBtn = screen.getByTestId('edit-hero-task-btn');
      await user.click(editHeroBtn);

      await waitFor(() => {
        expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      });

      // 2. Modify multiple domain properties
      await user.clear(screen.getByTestId('task-form-title'));
      await user.type(screen.getByTestId('task-form-title'), 'Hero Task Synchronized Title');

      await user.selectOptions(screen.getByTestId('task-form-priority'), 'high');
      await user.selectOptions(screen.getByTestId('task-form-department'), '#Audio');
      await user.selectOptions(screen.getByTestId('task-form-status'), 'blocked');

      await user.clear(screen.getByTestId('task-form-estimate'));
      await user.type(screen.getByTestId('task-form-estimate'), '240');

      await user.type(screen.getByTestId('task-form-blocking-target'), 'Audio Lead');

      // Submit modal
      await user.click(screen.getByTestId('task-form-submit-btn'));

      // Verify modal closes and UserDashboard updates
      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
        expect(screen.getByTestId('active-task-title')).toHaveTextContent('Hero Task Synchronized Title');
      });

      // 3. Navigate to KanbanBoard: Verify updated title, department, blockingTarget, and column
      await user.click(screen.getByTestId('nav-pill-kanban'));

      await waitFor(() => {
        expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
      });

      // Task must now reside in the "blocked" column
      const blockedCol = screen.getByTestId('kanban-col-blocked');
      expect(blockedCol).toBeInTheDocument();
      const card = screen.getByTestId('kanban-card-task-hero-active');
      expect(blockedCol).toContainElement(card);

      expect(card).toHaveTextContent('Hero Task Synchronized Title');
      expect(card).toHaveTextContent('#Audio');
      expect(card).toHaveTextContent('⚠️ Bloccante per Audio Lead');

      // 4. Navigate to GanttView: Verify updated title and blockingTarget label
      await user.click(screen.getByTestId('nav-pill-gantt'));

      await waitFor(() => {
        expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
      });

      const ganttRow = screen.getByTestId('gantt-row-task-hero-active');
      expect(ganttRow).toBeInTheDocument();
      expect(ganttRow).toHaveTextContent('Hero Task Synchronized Title');
      expect(ganttRow).toHaveTextContent('⚠️ Sblocca Audio Lead');
    });
  });

  // ==========================================================================
  // VECTOR 2: KanbanBoard -> GanttView & UserDashboard Cross-View Synchronization
  // ==========================================================================
  describe('Vector 2: KanbanBoard -> GanttView & UserDashboard Sync', () => {
    it('Edits executed in KanbanBoard propagate reactively to GanttView and UserDashboard', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();

      render(<App />);

      // Navigate to KanbanBoard
      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-kanban')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('nav-pill-kanban'));

      await waitFor(() => {
        expect(screen.getByTestId('kanban-edit-task-hero-active')).toBeInTheDocument();
      });

      // 1. Edit task from Kanban
      await user.click(screen.getByTestId('kanban-edit-task-hero-active'));

      await waitFor(() => {
        expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      });

      await user.clear(screen.getByTestId('task-form-title'));
      await user.type(screen.getByTestId('task-form-title'), 'Kanban Mutated Title');

      await user.clear(screen.getByTestId('task-form-description'));
      await user.type(screen.getByTestId('task-form-description'), 'Detailed description from Kanban edit');

      await user.selectOptions(screen.getByTestId('task-form-department'), '#UI/UX');
      await user.selectOptions(screen.getByTestId('task-form-status'), 'in_review');

      await user.clear(screen.getByTestId('task-form-blocking-target'));
      await user.type(screen.getByTestId('task-form-blocking-target'), 'QA Team');

      // Submit
      await user.click(screen.getByTestId('task-form-submit-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
      });

      // In Kanban: task moved to in_review
      const reviewCol = screen.getByTestId('kanban-col-in_review');
      const card = screen.getByTestId('kanban-card-task-hero-active');
      expect(reviewCol).toContainElement(card);
      expect(card).toHaveTextContent('Kanban Mutated Title');
      expect(card).toHaveTextContent('#UI/UX');
      expect(card).toHaveTextContent('⚠️ Bloccante per QA Team');

      // 2. Navigate to GanttView
      await user.click(screen.getByTestId('nav-pill-gantt'));
      await waitFor(() => {
        expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
      });
      const ganttRow = screen.getByTestId('gantt-row-task-hero-active');
      expect(ganttRow).toHaveTextContent('Kanban Mutated Title');
      expect(ganttRow).toHaveTextContent('⚠️ Sblocca QA Team');

      // 3. Navigate back to UserDashboard
      await user.click(screen.getByTestId('nav-pill-dashboard'));
      await waitFor(() => {
        expect(screen.getByTestId('hero-card')).toBeInTheDocument();
      });

      expect(screen.getByTestId('active-task-title')).toHaveTextContent('Kanban Mutated Title');
      expect(screen.getByTestId('active-task-desc')).toHaveTextContent('Detailed description from Kanban edit');
      expect(screen.getByTestId('task-status-select')).toHaveValue('In revisione');
    });
  });

  // ==========================================================================
  // VECTOR 3: GanttView -> KanbanBoard & UserDashboard Cross-View Synchronization
  // ==========================================================================
  describe('Vector 3: GanttView -> KanbanBoard & UserDashboard Sync', () => {
    it('Edits executed in GanttView propagate reactively to KanbanBoard and UserDashboard', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      const user = userEvent.setup();

      render(<App />);

      // Navigate to GanttView
      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-gantt')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('nav-pill-gantt'));

      await waitFor(() => {
        expect(screen.getByTestId('gantt-edit-task-hero-active')).toBeInTheDocument();
      });

      // 1. Edit from Gantt
      await user.click(screen.getByTestId('gantt-edit-task-hero-active'));

      await waitFor(() => {
        expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      });

      await user.clear(screen.getByTestId('task-form-title'));
      await user.type(screen.getByTestId('task-form-title'), 'Gantt Sourced Mutation Title');

      await user.selectOptions(screen.getByTestId('task-form-status'), 'completed');
      await user.selectOptions(screen.getByTestId('task-form-department'), '#VFX');

      // Clear blocking target
      await user.clear(screen.getByTestId('task-form-blocking-target'));

      // Submit
      await user.click(screen.getByTestId('task-form-submit-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
      });

      // Gantt row reflects new title
      const ganttRow = screen.getByTestId('gantt-row-task-hero-active');
      expect(ganttRow).toHaveTextContent('Gantt Sourced Mutation Title');

      // 2. Navigate to Kanban
      await user.click(screen.getByTestId('nav-pill-kanban'));
      await waitFor(() => {
        expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
      });

      const completedCol = screen.getByTestId('kanban-col-completed');
      const card = screen.getByTestId('kanban-card-task-hero-active');
      expect(completedCol).toContainElement(card);
      expect(card).toHaveTextContent('Gantt Sourced Mutation Title');
      expect(card).toHaveTextContent('#VFX');

      // 3. Navigate to User Dashboard
      await user.click(screen.getByTestId('nav-pill-dashboard'));
      // If admin, switch to user view or check
      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // VECTOR 4: All 10 Domain Properties Modification by 'user' and 'admin'
  // ==========================================================================
  describe('Vector 4: All 10 Domain Properties Universal Editing', () => {
    it('Regular user ("user" role) can modify all 10 domain properties via UI modal', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-hero-task-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-hero-task-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      });

      // Test all 10 inputs
      // 1. Title
      await user.clear(screen.getByTestId('task-form-title'));
      await user.type(screen.getByTestId('task-form-title'), 'Prop Test Title by User');

      // 2. Description
      await user.clear(screen.getByTestId('task-form-description'));
      await user.type(screen.getByTestId('task-form-description'), 'Prop Test Description by User');

      // 3. Priority
      await user.selectOptions(screen.getByTestId('task-form-priority'), 'low');

      // 4. Department
      await user.selectOptions(screen.getByTestId('task-form-department'), '#Audio');

      // 5. Assignee (reassign to admin)
      await user.selectOptions(screen.getByTestId('task-form-assignee'), adminUser.id);

      // 6. Estimate
      await user.clear(screen.getByTestId('task-form-estimate'));
      await user.type(screen.getByTestId('task-form-estimate'), '360');

      // 7. Start Date
      await user.clear(screen.getByTestId('task-form-start-date'));
      await user.type(screen.getByTestId('task-form-start-date'), '2026-11-06');

      // 8. Due Date
      await user.clear(screen.getByTestId('task-form-due-date'));
      await user.type(screen.getByTestId('task-form-due-date'), '2026-11-20');

      // 9. Blocking Target
      await user.clear(screen.getByTestId('task-form-blocking-target'));
      await user.type(screen.getByTestId('task-form-blocking-target'), 'Core Engineering');

      // 10. Status
      await user.selectOptions(screen.getByTestId('task-form-status'), 'blocked');

      // Submit form
      await user.click(screen.getByTestId('task-form-submit-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
      });

      // Verify directly in Supabase Mock that all 10 properties were persisted
      const { data: dbRow } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', 'task-hero-active')
        .single();

      expect(dbRow?.title).toBe('Prop Test Title by User');
      expect(dbRow?.description).toBe('Prop Test Description by User');
      expect(dbRow?.priority).toBe('low');
      expect(dbRow?.department_tag).toBe('#Audio');
      expect(dbRow?.assignee_id).toBe(adminUser.id);
      expect(dbRow?.estimated_minutes).toBe(360);
      expect(dbRow?.start_date).toContain('2026-11-06');
      expect(dbRow?.due_date).toContain('2026-11-20');
      expect(dbRow?.blocking_target).toBe('Core Engineering');
      expect(dbRow?.status).toBe('blocked');
    });

    it('Admin user ("admin" role) can modify all 10 domain properties via UI modal', async () => {
      mockSupabase.testUtils.setMockUser(adminUser);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-kanban')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('nav-pill-kanban'));

      await waitFor(() => {
        expect(screen.getByTestId('kanban-edit-task-hero-active')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('kanban-edit-task-hero-active'));

      await waitFor(() => {
        expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      });

      // 1. Title
      await user.clear(screen.getByTestId('task-form-title'));
      await user.type(screen.getByTestId('task-form-title'), 'Prop Test Title by Admin');

      // 2. Description
      await user.clear(screen.getByTestId('task-form-description'));
      await user.type(screen.getByTestId('task-form-description'), 'Prop Test Description by Admin');

      // 3. Priority
      await user.selectOptions(screen.getByTestId('task-form-priority'), 'high');

      // 4. Department
      await user.selectOptions(screen.getByTestId('task-form-department'), '#3DEnv');

      // 5. Assignee (reassign to regularUser)
      await user.selectOptions(screen.getByTestId('task-form-assignee'), regularUser.id);

      // 6. Estimate
      await user.clear(screen.getByTestId('task-form-estimate'));
      await user.type(screen.getByTestId('task-form-estimate'), '420');

      // 7. Start Date
      await user.clear(screen.getByTestId('task-form-start-date'));
      await user.type(screen.getByTestId('task-form-start-date'), '2026-11-07');

      // 8. Due Date
      await user.clear(screen.getByTestId('task-form-due-date'));
      await user.type(screen.getByTestId('task-form-due-date'), '2026-11-22');

      // 9. Blocking Target
      await user.clear(screen.getByTestId('task-form-blocking-target'));
      await user.type(screen.getByTestId('task-form-blocking-target'), 'Marketing');

      // 10. Status
      await user.selectOptions(screen.getByTestId('task-form-status'), 'in_review');

      // Submit
      await user.click(screen.getByTestId('task-form-submit-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
      });

      // Verify in DB
      const { data: dbRow } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', 'task-hero-active')
        .single();

      expect(dbRow?.title).toBe('Prop Test Title by Admin');
      expect(dbRow?.description).toBe('Prop Test Description by Admin');
      expect(dbRow?.priority).toBe('high');
      expect(dbRow?.department_tag).toBe('#3DEnv');
      expect(dbRow?.assignee_id).toBe(regularUser.id);
      expect(dbRow?.estimated_minutes).toBe(420);
      expect(dbRow?.start_date).toContain('2026-11-07');
      expect(dbRow?.due_date).toContain('2026-11-22');
      expect(dbRow?.blocking_target).toBe('Marketing');
      expect(dbRow?.status).toBe('in_review');
    });
  });

  // ==========================================================================
  // VECTOR 5: Form Validation & Security Boundaries
  // ==========================================================================
  describe('Vector 5: Form Validation & Security Boundaries', () => {
    it('Requires non-empty title during edit and blocks submission if empty', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-hero-task-btn')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('edit-hero-task-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      });

      // Set whitespace title and submit to trigger trim() validation
      await user.clear(screen.getByTestId('task-form-title'));
      await user.type(screen.getByTestId('task-form-title'), '   ');
      await user.click(screen.getByTestId('task-form-submit-btn'));

      // Modal must remain open and display validation error
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('task-form-error')).toHaveTextContent('Il titolo della task è obbligatorio.');
      });
    });

    it('Setting optional properties to empty cleanly clears them to null in database', async () => {
      mockSupabase.testUtils.setMockUser(regularUser);
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-hero-task-btn')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('edit-hero-task-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      });

      // Unassign assignee
      await user.selectOptions(screen.getByTestId('task-form-assignee'), '');

      // Clear blocking target
      await user.clear(screen.getByTestId('task-form-blocking-target'));

      // Submit
      await user.click(screen.getByTestId('task-form-submit-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('task-modal')).toBeNull();
      });

      const { data: dbRow } = await supabase
        .from('tasks')
        .select('assignee_id, blocking_target')
        .eq('id', 'task-hero-active')
        .single();

      expect(dbRow?.assignee_id).toBeNull();
      expect(dbRow?.blocking_target).toBeNull();
    });
  });
});
