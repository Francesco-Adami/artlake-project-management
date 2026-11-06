import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase } from '../../src/services/mockSupabase';
import { App } from '../../src/App';
import { TaskRow } from '../../src/types/models';

describe('Integration: Milestone 4 Operational Views & Optimistic UI', () => {
  const mockUser = {
    id: 'user-francesco',
    email: 'francesco.p@artlake.studio',
    full_name: 'Francesco P.',
    role: 'admin' as const,
    department: '#TechArt',
  };

  const mockProject = {
    id: 'project-artlake-alpha',
    name: 'ArtLake Studio Alpha',
    description: 'Progetto di produzione interno',
    created_by: 'user-francesco',
    created_at: '2026-11-01T08:00:00Z',
  };

  const getSeedTasks = (): TaskRow[] => [
    {
      id: 'task-urp-hero',
      project_id: 'project-artlake-alpha',
      title: 'Refactor Pipeline URP & Material Shader Graph',
      description: 'Aggiornamento Custom Function Nodes e passaggio al Render Graph su Unity 6.',
      status: 'in_progress',
      priority: 'high',
      department_tag: '#TechArt',
      assignee_id: 'user-francesco',
      queue_order: 0,
      estimated_minutes: 600,
      logged_minutes: 390,
      due_date: '2026-11-08T18:00:00Z',
      start_date: null,
      blocker_reason: null,
      blocking_target: null,
      review_output_link: null,
      created_at: '2026-11-02T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
    },
    {
      id: 'task-audio-queue',
      project_id: 'project-artlake-alpha',
      title: 'Setup Audio Mixer & Snapshot URP',
      description: 'Configurazione mixer group e snapshot audio.',
      status: 'not_started',
      priority: 'medium',
      department_tag: '#Audio',
      assignee_id: 'user-francesco',
      queue_order: 1,
      estimated_minutes: 360,
      logged_minutes: 0,
      due_date: '2026-11-09T18:00:00Z',
      start_date: null,
      blocker_reason: null,
      blocking_target: 'Audio Team',
      review_output_link: null,
      created_at: '2026-11-02T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
    },
    {
      id: 'task-orphan-backlog',
      project_id: 'project-artlake-alpha',
      title: 'Shader Acqua Riva & Schiuma Costiera',
      description: 'Task orfana nel backlog senza assegnatario.',
      status: 'not_started',
      priority: 'low',
      department_tag: '#TechArt',
      assignee_id: null,
      queue_order: 99,
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
  ];

  const getSeedSubtasks = () => [
    {
      id: 'sub-1',
      task_id: 'task-urp-hero',
      title: 'Audit shader compatibilità Unity 6',
      is_completed: true,
      position: 0,
      created_at: '2026-11-02T10:30:00Z',
    },
    {
      id: 'sub-2',
      task_id: 'task-urp-hero',
      title: 'Migrazione nodi Custom Function a HLSL',
      is_completed: false,
      position: 1,
      created_at: '2026-11-02T10:31:00Z',
    },
  ];

  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    localStorage.clear();

    mockSupabase.testUtils.seedDatabase({
      profiles: [
        {
          id: mockUser.id,
          email: mockUser.email,
          full_name: mockUser.full_name,
          initials: 'FP',
          avatar_url: null,
          role: mockUser.role,
          department: mockUser.department,
          active_task_id: 'task-urp-hero',
          created_at: '2026-11-01T08:00:00Z',
        },
      ],
      projects: [mockProject],
      project_members: [
        {
          id: 'pm-1',
          project_id: mockProject.id,
          user_id: mockUser.id,
          user_email: mockUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
      ],
      tasks: getSeedTasks(),
      subtasks: getSeedSubtasks(),
      task_comments: [],
      task_attachments: [],
      time_logs: [],
    });

    mockSupabase.testUtils.setMockUser(mockUser);
    localStorage.setItem('artlake_active_project_id', mockProject.id);
  });

  it('renders 70/30 User Dashboard layout with Hero task and Priority Queue', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('hero-card')).toBeInTheDocument();
    });

    // Check Hero Card (70%)
    expect(screen.getByTestId('active-task-title')).toHaveTextContent(
      'Refactor Pipeline URP & Material Shader Graph'
    );
    expect(screen.getByTestId('active-task-progress-fill')).toHaveStyle({ width: '65%' });

    // Check Checklist Operativa
    expect(screen.getByTestId('checklist-item-sub-1')).toHaveClass('completed');
    expect(screen.getByTestId('checklist-item-sub-2')).not.toHaveClass('completed');
    expect(screen.getByTestId('checklist-counter')).toHaveTextContent('1 / 2 completati');

    // Check Queue Column (30%)
    expect(screen.getByTestId('queue-column')).toBeInTheDocument();
    expect(screen.getByTestId('queue-card-task-audio-queue')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Bloccante per Audio Team')).toBeInTheDocument();
  });

  it('toggles subtask checkbox with 0ms optimistic UI update', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('checklist-item-sub-2')).toBeInTheDocument();
    });

    // Click on unchecked subtask
    await user.click(screen.getByTestId('checklist-item-sub-2'));

    // Instant optimistic checkmark
    expect(screen.getByTestId('checklist-item-sub-2')).toHaveClass('completed');
    expect(screen.getByTestId('checklist-counter')).toHaveTextContent('2 / 2 completati');

    // Background verification in database
    await waitFor(() => {
      const state = mockSupabase.testUtils.getSnapshot();
      const updatedSub = state.subtasks.find((s) => s.id === 'sub-2');
      expect(updatedSub?.is_completed).toBe(true);
    });
  });

  it('adds subtask via Enter key with optimistic rendering', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('new-subtask-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('new-subtask-input');
    await user.type(input, 'Test rendering fallback{enter}');

    // Instant appearance in list
    expect(screen.getByText('Test rendering fallback')).toBeInTheDocument();
    expect(screen.getByTestId('checklist-counter')).toHaveTextContent('1 / 3 completati');

    // Verification in database
    await waitFor(() => {
      const state = mockSupabase.testUtils.getSnapshot();
      expect(state.subtasks.some((s) => s.title === 'Test rendering fallback')).toBe(true);
    });
  });

  it('promotes queued task atomically on "Passa a questa task →"', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('promote-btn-task-audio-queue')).toBeInTheDocument();
    });

    // Click promotion button
    await user.click(screen.getByTestId('promote-btn-task-audio-queue'));

    // Audio task becomes new Hero task (70%)
    await waitFor(() => {
      expect(screen.getByTestId('active-task-title')).toHaveTextContent(
        'Setup Audio Mixer & Snapshot URP'
      );
    });

    // Previous URP task pushed to Queue column (30%)
    expect(screen.getByTestId('queue-card-task-urp-hero')).toBeInTheDocument();
  });

  it('switches to Admin Dashboard and displays 3x2 grid and orphan backlog', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('role-btn-admin')).toBeInTheDocument();
    });

    // Toggle Role Switcher to Admin
    await user.click(screen.getByTestId('role-btn-admin'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('admin-team-grid')).toBeInTheDocument();
    });

    // Verify orphan task count pill
    expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
      '1 Task Orfane (Non assegnate)'
    );

    // Assign orphan task
    await user.click(screen.getByTestId('assign-orphan-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
        '0 Task Orfane (Tutte assegnate ✓)'
      );
    });
  });

  it('switches to Kanban view and advances card status', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('nav-pill-kanban')).toBeInTheDocument();
    });

    // Navigate to Kanban
    await user.click(screen.getByTestId('nav-pill-kanban'));

    await waitFor(() => {
      expect(screen.getByTestId('kanban-view')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    });

    // Move audio task from not_started to in_progress
    const moveBtn = screen.getByTestId('kanban-move-task-audio-queue');
    await user.click(moveBtn);

    await waitFor(() => {
      const state = mockSupabase.testUtils.getSnapshot();
      const updated = state.tasks.find((t) => t.id === 'task-audio-queue');
      expect(updated?.status).toBe('in_progress');
    });
  });

  it('switches to Gantt view and renders 14-day timeline with today-col highlight', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('nav-pill-gantt')).toBeInTheDocument();
    });

    // Navigate to Gantt
    await user.click(screen.getByTestId('nav-pill-gantt'));

    await waitFor(() => {
      expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
      expect(screen.getByTestId('gantt-container')).toBeInTheDocument();
    });

    expect(screen.getByText('Task & Assegnatario')).toBeInTheDocument();
    expect(screen.getByText('5 Nov (Oggi)')).toHaveClass('today-col');
  });

  it('handles dynamic context bar on status change to Bloccato', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('task-status-select')).toBeInTheDocument();
    });

    // Select Bloccato
    await user.selectOptions(screen.getByTestId('task-status-select'), 'Bloccato');

    // Context bar should be displayed
    await waitFor(() => {
      expect(screen.getByTestId('status-context-bar')).toBeInTheDocument();
    });

    const contextInput = screen.getByTestId('status-context-input');
    await user.type(contextInput, 'In attesa approvazione pipeline');

    await user.click(screen.getByTestId('status-context-save-btn'));

    await waitFor(() => {
      const state = mockSupabase.testUtils.getSnapshot();
      const updatedTask = state.tasks.find((t) => t.id === 'task-urp-hero');
      expect(updatedTask?.status).toBe('blocked');
      expect(updatedTask?.blocker_reason).toBe('In attesa approvazione pipeline');
    });
  });

  it('posts comments to active task and persists in database', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    });

    const commentInput = screen.getByTestId('comment-input');
    await user.type(commentInput, 'Ottimizzazione terminata con successo.');
    await user.click(screen.getByTestId('comment-submit-btn'));

    // Optimistic appearance in comments list
    await waitFor(() => {
      expect(screen.getByText('Ottimizzazione terminata con successo.')).toBeInTheDocument();
    });

    // Database persistence verification
    await waitFor(() => {
      const state = mockSupabase.testUtils.getSnapshot();
      expect(
        state.task_comments.some(
          (c) => c.content === 'Ottimizzazione terminata con successo.' && c.task_id === 'task-urp-hero'
        )
      ).toBe(true);
    });
  });

  it('filters tasks in Kanban view when toggling member filter', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('nav-pill-kanban')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('nav-pill-kanban'));

    await waitFor(() => {
      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    });

    // Both user-assigned and orphan tasks visible in "Tutto il Team"
    expect(screen.getByTestId('kanban-card-task-orphan-backlog')).toBeInTheDocument();

    // Switch to "Solo Francesco P."
    await user.click(screen.getByTestId('kanban-filter-mine'));

    // Orphan task should now be filtered out
    expect(screen.queryByTestId('kanban-card-task-orphan-backlog')).not.toBeInTheDocument();
    // User task remains visible
    expect(screen.getByTestId('kanban-card-task-urp-hero')).toBeInTheDocument();
  });
});
