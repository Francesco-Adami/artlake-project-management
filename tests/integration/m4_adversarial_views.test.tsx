import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase } from '../../src/services/mockSupabase';
import { App } from '../../src/App';
import { TaskRow } from '../../src/types/models';

describe('Adversarial Views & Boundary Stress Suite (Milestone 4)', () => {
  const adminUser = {
    id: 'user-admin',
    email: 'admin.lead@artlake.studio',
    full_name: 'Lead Director',
    role: 'admin' as const,
    department: '#Management',
  };

  const colleagueUser = {
    id: 'user-colleague',
    email: 'colleague.dev@artlake.studio',
    full_name: 'Dev Colleague',
    role: 'user' as const,
    department: '#CoreDev',
  };

  const primaryProject = {
    id: 'project-artlake-alpha',
    name: 'ArtLake Production Sprint',
    description: 'Progetto di produzione studio',
    created_by: 'user-admin',
    created_at: '2026-11-01T08:00:00Z',
  };

  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // SUITE 1: EMPTY PROJECT & 0-TASK BOUNDARY CONDITIONS
  // ==========================================================================
  describe('Boundary 1: Empty Project with 0 Tasks', () => {
    beforeEach(() => {
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
            id: colleagueUser.id,
            email: colleagueUser.email,
            full_name: colleagueUser.full_name,
            initials: 'DC',
            avatar_url: null,
            role: colleagueUser.role,
            department: colleagueUser.department,
            active_task_id: null,
            created_at: '2026-11-01T08:00:00Z',
          },
        ],
        projects: [primaryProject],
        project_members: [
          {
            id: 'pm-admin',
            project_id: primaryProject.id,
            user_id: adminUser.id,
            user_email: adminUser.email,
            invited_at: '2026-11-01T08:00:00Z',
          },
          {
            id: 'pm-colleague',
            project_id: primaryProject.id,
            user_id: colleagueUser.id,
            user_email: colleagueUser.email,
            invited_at: '2026-11-01T08:00:00Z',
          },
        ],
        tasks: [],
        subtasks: [],
        task_comments: [],
        task_attachments: [],
        time_logs: [],
      });

      mockSupabase.testUtils.setMockUser(adminUser);
      localStorage.setItem('artlake_active_project_id', primaryProject.id);
    });

    it('1.1 UserDashboard renders clean empty states without crashing or null pointer exceptions', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
        expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
      });

      // Left column: Hero card empty placeholder
      const emptyHero = screen.getByTestId('hero-card-empty');
      expect(emptyHero).toBeInTheDocument();
      expect(emptyHero).toHaveTextContent(
        'Nessuna task principale attiva nel progetto. Scegli una task dalla coda a destra.'
      );
      expect(screen.queryByTestId('hero-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('checklist-container')).not.toBeInTheDocument();

      // Right column: Queue column empty notice
      const queueColumn = screen.getByTestId('queue-column');
      expect(queueColumn).toBeInTheDocument();
      expect(screen.getByTestId('queue-count-label')).toHaveTextContent('0 in coda');
      expect(screen.getByText('Nessuna task in coda per questo progetto.')).toBeInTheDocument();
    });

    it('1.2 AdminDashboard renders 0-orphan count pill and inactive team member cards cleanly', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('role-btn-admin')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('role-btn-admin'));

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      // Orphan count pill
      expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
        '0 Task Orfane (Tutte assegnate ✓)'
      );

      // Clicking orphan button with 0 orphans does not crash and toasts notification
      const orphanBtn = screen.getByTestId('assign-orphan-btn');
      await user.click(orphanBtn);

      await waitFor(() => {
        expect(screen.getByTestId('admin-toast')).toHaveTextContent(
          'Nessuna task orfana rimasta nel backlog'
        );
      });

      // Team members grid: both members rendered with clean inactive states
      expect(screen.getByTestId(`member-card-${adminUser.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`member-card-${colleagueUser.id}`)).toBeInTheDocument();
      expect(screen.getAllByText('Nessuna task in lavorazione')).toHaveLength(2);
      expect(screen.getAllByText('0h / 35h')).toHaveLength(2);
    });

    it('1.3 KanbanBoard renders all 5 columns with 0 count and empty column notices', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-kanban')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('nav-pill-kanban'));

      await waitFor(() => {
        expect(screen.getByTestId('kanban-view')).toBeInTheDocument();
        expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
      });

      const columnStatuses = ['not_started', 'in_progress', 'blocked', 'in_review', 'completed'];
      for (const status of columnStatuses) {
        const col = screen.getByTestId(`kanban-col-${status}`);
        expect(col).toBeInTheDocument();
        expect(col.querySelector('.kanban-count')).toHaveTextContent('0');
      }

      const emptyNotices = screen.getAllByText('Nessuna task');
      expect(emptyNotices).toHaveLength(5);
    });

    it('1.4 GanttView renders empty timeline notice with zero horizontal bars', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-gantt')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('nav-pill-gantt'));

      await waitFor(() => {
        expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
        expect(screen.getByTestId('gantt-container')).toBeInTheDocument();
      });

      expect(screen.getByText('Nessuna task schedulata nel Gantt.')).toBeInTheDocument();
      expect(screen.queryByTestId(/^gantt-row-/)).not.toBeInTheDocument();
    });

    it('1.5 AdminDashboard handles project with 0 team members without throwing', async () => {
      // Re-seed with 0 project members
      mockSupabase.testUtils.seedDatabase({
        project_members: [],
      });

      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('role-btn-admin')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('role-btn-admin'));

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      const grid = screen.getByTestId('admin-team-grid');
      expect(grid).toBeInTheDocument();
      expect(grid.children).toHaveLength(0);
    });
  });

  // ==========================================================================
  // SUITE 2: ADMIN ORPHAN ASSIGNMENT STRESS & CONCURRENCY
  // ==========================================================================
  describe('Boundary 2: Admin Orphan Assignment Stress', () => {
    const seedMultipleOrphans = (): TaskRow[] => [
      {
        id: 'orphan-1',
        project_id: primaryProject.id,
        title: 'Rigging Boss Golem Montagna',
        description: 'Orfana 1',
        status: 'not_started',
        priority: 'high',
        department_tag: '#TechArt',
        assignee_id: null,
        queue_order: 10,
        estimated_minutes: 300,
        logged_minutes: 0,
        due_date: null,
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-02T10:00:00Z',
        updated_at: '2026-11-02T10:00:00Z',
      },
      {
        id: 'orphan-2',
        project_id: primaryProject.id,
        title: 'Bake Occlusion & Lightmap Cripta',
        description: 'Orfana 2',
        status: 'not_started',
        priority: 'medium',
        department_tag: '#Environment',
        assignee_id: null,
        queue_order: 11,
        estimated_minutes: 240,
        logged_minutes: 0,
        due_date: null,
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-02T10:01:00Z',
        updated_at: '2026-11-02T10:01:00Z',
      },
      {
        id: 'orphan-3',
        project_id: primaryProject.id,
        title: 'Mix Audio Creature Subacquee',
        description: 'Orfana 3',
        status: 'not_started',
        priority: 'low',
        department_tag: '#Audio',
        assignee_id: null,
        queue_order: 12,
        estimated_minutes: 180,
        logged_minutes: 0,
        due_date: null,
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-02T10:02:00Z',
        updated_at: '2026-11-02T10:02:00Z',
      },
    ];

    beforeEach(() => {
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
            id: colleagueUser.id,
            email: colleagueUser.email,
            full_name: colleagueUser.full_name,
            initials: 'DC',
            avatar_url: null,
            role: colleagueUser.role,
            department: colleagueUser.department,
            active_task_id: null,
            created_at: '2026-11-01T08:00:00Z',
          },
        ],
        projects: [primaryProject],
        project_members: [
          {
            id: 'pm-admin',
            project_id: primaryProject.id,
            user_id: adminUser.id,
            user_email: adminUser.email,
            invited_at: '2026-11-01T08:00:00Z',
          },
          {
            id: 'pm-colleague',
            project_id: primaryProject.id,
            user_id: colleagueUser.id,
            user_email: colleagueUser.email,
            invited_at: '2026-11-01T08:00:00Z',
          },
        ],
        tasks: seedMultipleOrphans(),
        subtasks: [],
        task_comments: [],
        task_attachments: [],
        time_logs: [],
      });

      mockSupabase.testUtils.setMockUser(adminUser);
      localStorage.setItem('artlake_active_project_id', primaryProject.id);
    });

    it('2.1 Sequential orphan assignment assigns tasks one-by-one until exhaustion', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('role-btn-admin')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('role-btn-admin'));

      await waitFor(() => {
        expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
          '3 Task Orfane (Non assegnate)'
        );
      });

      const orphanBtn = screen.getByTestId('assign-orphan-btn');

      // 1st assignment
      await user.click(orphanBtn);
      await waitFor(() => {
        expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
          '2 Task Orfane (Non assegnate)'
        );
      });

      // 2nd assignment
      await user.click(orphanBtn);
      await waitFor(() => {
        expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
          '1 Task Orfane (Non assegnate)'
        );
      });

      // 3rd assignment
      await user.click(orphanBtn);
      await waitFor(() => {
        expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
          '0 Task Orfane (Tutte assegnate ✓)'
        );
      });

      // 4th click: backlog exhausted
      await user.click(orphanBtn);
      await waitFor(() => {
        expect(screen.getByTestId('admin-toast')).toHaveTextContent(
          'Nessuna task orfana rimasta nel backlog'
        );
        expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
          '0 Task Orfane (Tutte assegnate ✓)'
        );
      });

      // Confirm all 3 tasks now have assignee in database
      const dbTasks = mockSupabase.testUtils.getSnapshot().tasks;
      expect(dbTasks.every((t) => t.assignee_id !== null)).toBe(true);
    });

    it('2.2 Rapid clicks on orphan assignment handles optimistic queue updates cleanly', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('role-btn-admin')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('role-btn-admin'));

      const orphanBtn = screen.getByTestId('assign-orphan-btn');
      await waitFor(() => {
        expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
          '3 Task Orfane (Non assegnate)'
        );
      });

      // Rapidly trigger clicks
      await user.click(orphanBtn);
      await user.click(orphanBtn);

      await waitFor(() => {
        const countText = screen.getByTestId('orphan-count-text').textContent;
        // Count should strictly decrease without NaN or negative numbers
        expect(['0 Task Orfane (Tutte assegnate ✓)', '1 Task Orfane (Non assegnate)', '2 Task Orfane (Non assegnate)']).toContain(countText);
      });
    });

    it('2.3 Assigning orphan when target member already has active task increments queued count without overwriting', async () => {
      // Give adminUser an already active task
      mockSupabase.testUtils.seedDatabase({
        tasks: [
          {
            id: 'task-admin-active',
            project_id: primaryProject.id,
            title: 'Lead Architecture Review',
            description: 'Task attiva',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#Management',
            assignee_id: adminUser.id,
            queue_order: 0,
            estimated_minutes: 480,
            logged_minutes: 120,
            due_date: '2026-11-10T18:00:00Z',
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: '2026-11-01T08:00:00Z',
            updated_at: '2026-11-01T08:00:00Z',
          },
          ...seedMultipleOrphans(),
        ],
      });

      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('role-btn-admin')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('role-btn-admin'));

      await waitFor(() => {
        expect(screen.getByTestId(`member-card-${adminUser.id}`)).toBeInTheDocument();
      });

      const memberCard = screen.getByTestId(`member-card-${adminUser.id}`);
      expect(memberCard).toHaveTextContent('Lead Architecture Review');
      expect(memberCard).toHaveTextContent('Task in coda: 0');

      // Assign an orphan task
      await user.click(screen.getByTestId('assign-orphan-btn'));

      // Active task remains 'Lead Architecture Review', but queued task count becomes 1
      await waitFor(() => {
        expect(memberCard).toHaveTextContent('Lead Architecture Review');
        expect(memberCard).toHaveTextContent('Task in coda: 1');
      });
    });
  });

  // ==========================================================================
  // SUITE 3: KANBAN FILTER PERMUTATIONS & EDGE BOUNDARIES
  // ==========================================================================
  describe('Boundary 3: Kanban Filter Permutations', () => {
    beforeEach(() => {
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
            id: colleagueUser.id,
            email: colleagueUser.email,
            full_name: colleagueUser.full_name,
            initials: 'DC',
            avatar_url: null,
            role: colleagueUser.role,
            department: colleagueUser.department,
            active_task_id: null,
            created_at: '2026-11-01T08:00:00Z',
          },
        ],
        projects: [primaryProject],
        project_members: [
          {
            id: 'pm-admin',
            project_id: primaryProject.id,
            user_id: adminUser.id,
            user_email: adminUser.email,
            invited_at: '2026-11-01T08:00:00Z',
          },
          {
            id: 'pm-colleague',
            project_id: primaryProject.id,
            user_id: colleagueUser.id,
            user_email: colleagueUser.email,
            invited_at: '2026-11-01T08:00:00Z',
          },
        ],
        // All tasks assigned to colleagueUser or orphan; ZERO assigned to adminUser
        tasks: [
          {
            id: 'task-colleague-1',
            project_id: primaryProject.id,
            title: 'Colleague Core Task',
            description: 'Task del collega',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#CoreDev',
            assignee_id: colleagueUser.id,
            queue_order: 0,
            estimated_minutes: 300,
            logged_minutes: 100,
            due_date: '2026-11-09T18:00:00Z',
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: '2026-11-02T10:00:00Z',
            updated_at: '2026-11-02T10:00:00Z',
          },
          {
            id: 'task-colleague-2',
            project_id: primaryProject.id,
            title: 'Colleague Review Task',
            description: 'Task in review',
            status: 'in_review',
            priority: 'medium',
            department_tag: '#CoreDev',
            assignee_id: colleagueUser.id,
            queue_order: 1,
            estimated_minutes: 180,
            logged_minutes: 180,
            due_date: '2026-11-10T18:00:00Z',
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: 'https://github.com/artlake/pr/1',
            created_at: '2026-11-02T10:00:00Z',
            updated_at: '2026-11-02T10:00:00Z',
          },
          {
            id: 'task-orphan-backlog',
            project_id: primaryProject.id,
            title: 'Unassigned Environment Assets',
            description: 'Orfana',
            status: 'not_started',
            priority: 'low',
            department_tag: '#Environment',
            assignee_id: null,
            queue_order: 9,
            estimated_minutes: 240,
            logged_minutes: 0,
            due_date: null,
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: '2026-11-02T10:00:00Z',
            updated_at: '2026-11-02T10:00:00Z',
          },
        ],
        subtasks: [],
        task_comments: [],
        task_attachments: [],
        time_logs: [],
      });

      mockSupabase.testUtils.setMockUser(adminUser);
      localStorage.setItem('artlake_active_project_id', primaryProject.id);
    });

    it('3.1 Toggling "Solo [Utente]" when user has 0 assigned tasks renders all columns empty cleanly', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-kanban')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('nav-pill-kanban'));

      await waitFor(() => {
        expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
      });

      // In "Tutto il Team", colleague and orphan tasks are visible
      expect(screen.getByTestId('kanban-card-task-colleague-1')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-card-task-colleague-2')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-card-task-orphan-backlog')).toBeInTheDocument();

      // Switch to "Solo Lead Director"
      await user.click(screen.getByTestId('kanban-filter-mine'));

      // All cards disappear because adminUser has 0 tasks
      await waitFor(() => {
        expect(screen.queryByTestId('kanban-card-task-colleague-1')).not.toBeInTheDocument();
        expect(screen.queryByTestId('kanban-card-task-colleague-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('kanban-card-task-orphan-backlog')).not.toBeInTheDocument();
      });

      // All 5 columns show "Nessuna task"
      expect(screen.getAllByText('Nessuna task')).toHaveLength(5);

      // Switch back to "Tutto il Team"
      await user.click(screen.getByTestId('kanban-filter-all'));

      await waitFor(() => {
        expect(screen.getByTestId('kanban-card-task-colleague-1')).toBeInTheDocument();
        expect(screen.getByTestId('kanban-card-task-colleague-2')).toBeInTheDocument();
        expect(screen.getByTestId('kanban-card-task-orphan-backlog')).toBeInTheDocument();
      });
    });

    it('3.2 Kanban quick move button cycles through statuses properly', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-kanban')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('nav-pill-kanban'));

      await waitFor(() => {
        expect(screen.getByTestId('kanban-move-task-colleague-1')).toBeInTheDocument();
      });

      // task-colleague-1 is currently in_progress -> next cycle status is in_review
      const moveBtn = screen.getByTestId('kanban-move-task-colleague-1');
      expect(moveBtn).toHaveTextContent('→ In revisione');

      await user.click(moveBtn);

      await waitFor(() => {
        const snapshot = mockSupabase.testUtils.getSnapshot();
        const updated = snapshot.tasks.find((t) => t.id === 'task-colleague-1');
        expect(updated?.status).toBe('in_review');
      });
    });
  });

  // ==========================================================================
  // SUITE 4: GANTT TIMELINE BOUNDARIES & MATHEMATICAL EDGE CASES
  // ==========================================================================
  describe('Boundary 4: Gantt Timeline Boundaries & Math Edge Cases', () => {
    const boundaryTasks: TaskRow[] = [
      {
        id: 'task-zero-estimate',
        project_id: primaryProject.id,
        title: 'Zero Minutes Estimate Task',
        description: 'Estimated minutes is 0',
        status: 'in_progress',
        priority: 'medium',
        department_tag: '#CoreDev',
        assignee_id: adminUser.id,
        queue_order: 0,
        estimated_minutes: 0,
        logged_minutes: 0,
        due_date: '2026-11-05T18:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-01T08:00:00Z',
        updated_at: '2026-11-01T08:00:00Z',
      },
      {
        id: 'task-overbudget',
        project_id: primaryProject.id,
        title: 'Heavy Overbudget Task',
        description: 'Logged 1200m on 60m estimate (2000%)',
        status: 'in_progress',
        priority: 'high',
        department_tag: '#TechArt',
        assignee_id: adminUser.id,
        queue_order: 1,
        estimated_minutes: 60,
        logged_minutes: 1200,
        due_date: '2026-11-06T18:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-01T08:00:00Z',
        updated_at: '2026-11-01T08:00:00Z',
      },
      {
        id: 'task-negative-time',
        project_id: primaryProject.id,
        title: 'Negative Minutes Rectification Task',
        description: 'Logged minutes is negative due to correction',
        status: 'in_progress',
        priority: 'low',
        department_tag: '#Audio',
        assignee_id: adminUser.id,
        queue_order: 2,
        estimated_minutes: 60,
        logged_minutes: -30,
        due_date: '2026-11-07T18:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-01T08:00:00Z',
        updated_at: '2026-11-01T08:00:00Z',
      },
      {
        id: 'task-blocking-dependency',
        project_id: primaryProject.id,
        title: 'Physics Collision Bottleneck',
        description: 'Task with blocking target',
        status: 'blocked',
        priority: 'high',
        department_tag: '#CoreDev',
        assignee_id: adminUser.id,
        queue_order: 3,
        estimated_minutes: 360,
        logged_minutes: 90,
        due_date: '2026-11-08T18:00:00Z',
        start_date: null,
        blocker_reason: 'In attesa refactor PhysX',
        blocking_target: 'Gameplay Team',
        review_output_link: null,
        created_at: '2026-11-01T08:00:00Z',
        updated_at: '2026-11-01T08:00:00Z',
      },
      {
        id: 'task-future-date',
        project_id: primaryProject.id,
        title: 'Milestone 2099 Century Task',
        description: 'Due date in 2099',
        status: 'not_started',
        priority: 'low',
        department_tag: '#Management',
        assignee_id: adminUser.id,
        queue_order: 4,
        estimated_minutes: 600,
        logged_minutes: 0,
        due_date: '2099-12-31T23:59:59Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-01T08:00:00Z',
        updated_at: '2026-11-01T08:00:00Z',
      },
      {
        id: 'task-epoch-date',
        project_id: primaryProject.id,
        title: 'Unix Epoch Milestone',
        description: 'Due date in 1970',
        status: 'completed',
        priority: 'low',
        department_tag: '#CoreDev',
        assignee_id: adminUser.id,
        queue_order: 5,
        estimated_minutes: 120,
        logged_minutes: 120,
        due_date: '1970-01-01T00:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-01T08:00:00Z',
        updated_at: '2026-11-01T08:00:00Z',
      },
    ];

    beforeEach(() => {
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
            active_task_id: 'task-zero-estimate',
            created_at: '2026-11-01T08:00:00Z',
          },
        ],
        projects: [primaryProject],
        project_members: [
          {
            id: 'pm-admin',
            project_id: primaryProject.id,
            user_id: adminUser.id,
            user_email: adminUser.email,
            invited_at: '2026-11-01T08:00:00Z',
          },
        ],
        tasks: boundaryTasks,
        subtasks: [],
        task_comments: [],
        task_attachments: [],
        time_logs: [],
      });

      mockSupabase.testUtils.setMockUser(adminUser);
      localStorage.setItem('artlake_active_project_id', primaryProject.id);
    });

    it('4.1 GanttView handles 0-minute estimates safely without division by zero (NaN)', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-gantt')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('nav-pill-gantt'));

      await waitFor(() => {
        expect(screen.getByTestId('gantt-row-task-zero-estimate')).toBeInTheDocument();
      });

      // task-zero-estimate has 0m logged and 0m estimated: fallback denominator 60 yields 0%
      const zeroRow = screen.getByTestId('gantt-row-task-zero-estimate');
      expect(zeroRow).toHaveTextContent('0% · In corso');
      expect(zeroRow.textContent).not.toContain('NaN');
    });

    it('4.2 GanttView formats extreme over-budget percentage without crashing or overflow', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-gantt')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('nav-pill-gantt'));

      await waitFor(() => {
        expect(screen.getByTestId('gantt-row-task-overbudget')).toBeInTheDocument();
      });

      // 1200 / 60 = 20 -> 2000%
      const overbudgetRow = screen.getByTestId('gantt-row-task-overbudget');
      expect(overbudgetRow).toHaveTextContent('2000% · In corso');
    });

    it('4.3 GanttView displays blocking dependency badge instead of percentage for blocking tasks', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-gantt')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('nav-pill-gantt'));

      await waitFor(() => {
        expect(screen.getByTestId('gantt-row-task-blocking-dependency')).toBeInTheDocument();
      });

      const blockRow = screen.getByTestId('gantt-row-task-blocking-dependency');
      expect(blockRow).toHaveTextContent('⚠️ Sblocca Gameplay Team');
    });

    it('4.4 Extreme dates (year 2099 and year 1970) render stably across Gantt and User Dashboard', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-gantt')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('nav-pill-gantt'));

      // Both extreme date tasks are present in Gantt
      await waitFor(() => {
        expect(screen.getByTestId('gantt-row-task-future-date')).toBeInTheDocument();
        expect(screen.getByTestId('gantt-row-task-epoch-date')).toBeInTheDocument();
      });

      // Navigate back to User Dashboard: check queue cards
      await user.click(screen.getByTestId('nav-pill-dashboard'));

      await waitFor(() => {
        expect(screen.getByTestId('queue-card-task-future-date')).toBeInTheDocument();
      });

      // Future date card displays calculated day distance cleanly without throwing
      const futureCard = screen.getByTestId('queue-card-task-future-date');
      expect(futureCard).toBeInTheDocument();
      expect(futureCard.textContent).toMatch(/gg|Nessuna scadenza/);
    });

    it('4.5 GanttView limits tasks to top 8 items without layout overflow when project has >8 tasks', async () => {
      // Seed 14 tasks
      const extraTasks: TaskRow[] = Array.from({ length: 14 }, (_, i) => ({
        id: `extra-task-${i + 1}`,
        project_id: primaryProject.id,
        title: `Sprint Task #${i + 1}`,
        description: `Desc ${i + 1}`,
        status: 'in_progress',
        priority: 'medium',
        department_tag: '#CoreDev',
        assignee_id: adminUser.id,
        queue_order: i,
        estimated_minutes: 120,
        logged_minutes: 30,
        due_date: '2026-11-10T18:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-01T08:00:00Z',
        updated_at: '2026-11-01T08:00:00Z',
      }));

      mockSupabase.testUtils.seedDatabase({
        tasks: extraTasks,
      });

      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-pill-gantt')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('nav-pill-gantt'));

      await waitFor(() => {
        expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
      });

      // Exactly 8 rows are rendered
      const rows = screen.getAllByTestId(/^gantt-row-/);
      expect(rows).toHaveLength(8);
    });

    it('4.6 Date parser robustness: malformed date strings in due_date do not crash or throw unhandled exceptions', async () => {
      mockSupabase.testUtils.seedDatabase({
        tasks: [
          {
            id: 'task-malformed-date',
            project_id: primaryProject.id,
            title: 'Task With Malformed Due Date',
            description: 'Testing resilience to corrupted date strings',
            status: 'not_started',
            priority: 'low',
            department_tag: '#CoreDev',
            assignee_id: adminUser.id,
            queue_order: 0,
            estimated_minutes: 60,
            logged_minutes: 0,
            due_date: '2026-99-99T99:99:99Z',
            start_date: null,
            blocker_reason: null,
            blocking_target: null,
            review_output_link: null,
            created_at: '2026-11-01T08:00:00Z',
            updated_at: '2026-11-01T08:00:00Z',
          },
        ],
      });

      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      });

      // Try navigating to Kanban
      await user.click(screen.getByTestId('nav-pill-kanban'));

      // Verify whether kanban rendered or threw RangeError
      const kanbanBoard = await screen.findByTestId('kanban-board');
      expect(kanbanBoard).toBeInTheDocument();
    });
  });
});
