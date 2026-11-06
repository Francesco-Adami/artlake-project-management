import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase } from '../../src/services/mockSupabase';
import { App } from '../../src/App';
import { TaskRow } from '../../src/types/models';
import { getIsoYearWeek } from '../../src/utils/timeCalculations';

describe('Tier 4: ArtLake Studio Real-World Application End-to-End Scenarios', () => {
  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SCENARIO 1: Studio Artist Daily Workflow
  // ==========================================================================
  it('Scenario 1: Studio Artist Daily Workflow (Login, Hero not_started, Avvia Timer, Checklist, Blocker note & auto-stop)', async () => {
    const user = userEvent.setup();

    const artistUser = {
      id: 'artist-user-id',
      email: 'artist@artlake.studio',
      full_name: 'Studio Artist',
      role: 'user' as const,
      department: '#Art',
    };

    const studioProject = {
      id: 'project-artlake-alpha',
      name: 'ArtLake Studio Alpha',
      description: 'Progetto di produzione interno ArtLake',
      created_by: 'lead-producer-id',
      created_at: '2026-11-01T08:00:00Z',
    };

    const initialHeroTask: TaskRow = {
      id: 'task-artist-hero',
      project_id: studioProject.id,
      title: 'Concept Art Ambientale Riva & Fiume',
      description: 'Progettazione visual e mood lighting della zona fluviale alpina per ArtLake Studio.',
      status: 'not_started',
      priority: 'high',
      department_tag: '#Art',
      assignee_id: artistUser.id,
      queue_order: 0,
      estimated_minutes: 480,
      logged_minutes: 0,
      due_date: '2026-11-15T18:00:00Z',
      start_date: null,
      blocker_reason: null,
      blocking_target: null,
      review_output_link: null,
      created_at: '2026-11-02T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
    };

    const initialSubtasks = [
      {
        id: 'sub-thumb',
        task_id: initialHeroTask.id,
        title: 'Bozze thumbnail composizione e orizzonte',
        is_completed: false,
        position: 0,
        created_at: '2026-11-02T10:10:00Z',
      },
      {
        id: 'sub-palette',
        task_id: initialHeroTask.id,
        title: 'Palette colori tramonto e riflessi acqua',
        is_completed: false,
        position: 1,
        created_at: '2026-11-02T10:11:00Z',
      },
      {
        id: 'sub-details',
        task_id: initialHeroTask.id,
        title: 'Dettaglio rocce e vegetazione riparia in primo piano',
        is_completed: false,
        position: 2,
        created_at: '2026-11-02T10:12:00Z',
      },
    ];

    mockSupabase.testUtils.seedDatabase({
      profiles: [
        {
          id: artistUser.id,
          email: artistUser.email,
          full_name: artistUser.full_name,
          initials: 'SA',
          avatar_url: null,
          role: artistUser.role,
          department: artistUser.department,
          active_task_id: initialHeroTask.id,
          created_at: '2026-11-01T08:00:00Z',
        },
      ],
      projects: [studioProject],
      project_members: [
        {
          id: 'pm-artist',
          project_id: studioProject.id,
          user_id: artistUser.id,
          user_email: artistUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
      ],
      tasks: [initialHeroTask],
      subtasks: initialSubtasks,
      task_comments: [],
      task_attachments: [],
      time_logs: [],
    });

    // 1. Whitelisted artist logs in with Google OAuth
    mockSupabase.testUtils.setMockUser(artistUser);
    localStorage.setItem('artlake_active_project_id', studioProject.id);

    render(<App />);

    // 2. Select project & verify Workspace Shell rendered
    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('ArtLake Studio Alpha');
      expect(screen.getByTestId('active-task-title')).toBeInTheDocument();
    });

    // 3. Hero active task is in 'Non iniziata' state
    expect(screen.getByTestId('active-task-title')).toHaveTextContent(
      'Concept Art Ambientale Riva & Fiume'
    );
    const statusSelect = screen.getByTestId('task-status-select') as HTMLSelectElement;
    expect(statusSelect.value).toBe('Non iniziata');

    const toggleBtn = screen.getByTestId('timer-toggle-btn');
    expect(screen.getByTestId('timer-btn-text')).toHaveTextContent('Avvia Timer');

    // 4. Click 'Avvia Timer' -> auto-status change to 'In corso' and timer runs
    await user.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByTestId('timer-btn-text')).toHaveTextContent('Pausa');
    });
    expect(screen.getByTestId('timer-status-dot')).toHaveClass('bg-emerald');

    // Confirm auto-status change persisted to database
    await waitFor(() => {
      const snap = mockSupabase.testUtils.getSnapshot();
      const updatedTask = snap.tasks.find((t) => t.id === initialHeroTask.id);
      expect(updatedTask?.status).toBe('in_progress');
    });

    // 5. Check off subtasks in checklist with immediate strikethrough
    expect(screen.getByTestId('checklist-counter')).toHaveTextContent('0 / 3 completati');

    const item1 = screen.getByTestId('checklist-item-sub-thumb');
    const item2 = screen.getByTestId('checklist-item-sub-palette');
    const item3 = screen.getByTestId('checklist-item-sub-details');

    expect(item1).not.toHaveClass('completed');
    await user.click(item1);
    expect(item1).toHaveClass('completed');
    expect(screen.getByTestId('checklist-counter')).toHaveTextContent('1 / 3 completati');

    await user.click(item2);
    expect(item2).toHaveClass('completed');
    expect(screen.getByTestId('checklist-counter')).toHaveTextContent('2 / 3 completati');

    await user.click(item3);
    expect(item3).toHaveClass('completed');
    expect(screen.getByTestId('checklist-counter')).toHaveTextContent('3 / 3 completati');

    // Verify subtasks state in database
    await waitFor(() => {
      const snap = mockSupabase.testUtils.getSnapshot();
      expect(snap.subtasks.every((s) => s.is_completed)).toBe(true);
    });

    // Wait 1.1s to accumulate elapsed time on running timer session
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // 6. Add blocker note and switch status to 'Bloccato' -> auto-stops timer and commits duration
    await user.selectOptions(screen.getByTestId('task-status-select'), 'Bloccato');

    await waitFor(() => {
      expect(screen.getByTestId('status-context-bar')).toBeInTheDocument();
    });

    const blockerInput = screen.getByTestId('status-context-input');
    await user.type(blockerInput, 'In attesa approvazione moodboard da Art Director');
    await user.click(screen.getByTestId('status-context-save-btn'));

    // Verify timer auto-stopped
    await waitFor(() => {
      expect(screen.getByTestId('timer-btn-text')).toHaveTextContent('Avvia Timer');
    });
    expect(screen.getByTestId('timer-status-dot')).toHaveClass('bg-amber');

    // Verify database state: blocked status, blocker reason, and time log committed
    await waitFor(() => {
      const snap = mockSupabase.testUtils.getSnapshot();
      const updatedTask = snap.tasks.find((t) => t.id === initialHeroTask.id);
      expect(updatedTask?.status).toBe('blocked');
      expect(updatedTask?.blocker_reason).toBe('In attesa approvazione moodboard da Art Director');

      const logs = snap.time_logs.filter((l) => l.task_id === initialHeroTask.id);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].duration_seconds).toBeGreaterThanOrEqual(1);
      expect(logs[0].is_manual_edit).toBe(false);
    });
  });

  // ==========================================================================
  // SCENARIO 2: Lead Producer Project Setup
  // ==========================================================================
  it('Scenario 2: Lead Producer Project Setup (Admin login, create project, invite artists, orphan task badge & drawer)', async () => {
    const user = userEvent.setup();

    const producerAdmin = {
      id: 'producer-admin-id',
      email: 'producer@artlake.studio',
      full_name: 'Lead Producer',
      role: 'admin' as const,
      department: '#Management',
    };

    const teamArtists = [
      { id: 'artist-1-id', email: 'artist1@artlake.studio', full_name: 'Artist Uno', role: 'user' as const },
      { id: 'artist-2-id', email: 'artist2@artlake.studio', full_name: 'Artist Due', role: 'user' as const },
      { id: 'artist-3-id', email: 'artist3@artlake.studio', full_name: 'Artist Tre', role: 'user' as const },
    ];

    mockSupabase.testUtils.seedDatabase({
      profiles: [
        {
          id: producerAdmin.id,
          email: producerAdmin.email,
          full_name: producerAdmin.full_name,
          initials: 'LP',
          avatar_url: null,
          role: producerAdmin.role,
          department: producerAdmin.department,
          active_task_id: null,
          created_at: '2026-11-01T08:00:00Z',
        },
        ...teamArtists.map((a, idx) => ({
          id: a.id,
          email: a.email,
          full_name: a.full_name,
          initials: `A${idx + 1}`,
          avatar_url: null,
          role: a.role,
          department: '#Art',
          active_task_id: null,
          created_at: '2026-11-01T08:00:00Z',
        })),
      ],
      projects: [],
      project_members: [],
      tasks: [],
      subtasks: [],
      time_logs: [],
    });

    // 1. Admin logs in
    mockSupabase.testUtils.setMockUser(producerAdmin);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
    });

    // Open Admin Management Panel
    const toggleAdminBtn = screen.getByTestId('toggle-admin-panel');
    await user.click(toggleAdminBtn);

    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();

    // 2. Admin creates project 'ArtLake Studio Alpha'
    const projectInput = screen.getByTestId('new-project-input');
    await user.type(projectInput, 'ArtLake Studio Alpha');
    await user.click(screen.getByTestId('create-project-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('ArtLake Studio Alpha');
    });

    const activeProjectId = mockSupabase.testUtils.getSnapshot().projects[0].id;

    // 3. Invites 3 team members by email
    const inviteInput = screen.getByTestId('invite-email-input');
    const inviteBtn = screen.getByTestId('invite-btn');

    for (const artist of teamArtists) {
      await user.clear(inviteInput);
      await user.type(inviteInput, artist.email);
      await user.click(inviteBtn);
    }

    await waitFor(() => {
      const membersList = screen.getByTestId('members-list');
      expect(membersList).toHaveTextContent('artist1@artlake.studio');
      expect(membersList).toHaveTextContent('artist2@artlake.studio');
      expect(membersList).toHaveTextContent('artist3@artlake.studio');
    });

    // 4. Assigns tasks, leaving 1 orphan task in the backlog
    const projectTasks: TaskRow[] = [
      {
        id: 'task-admin-active',
        project_id: activeProjectId,
        title: 'Supervisione Milestone Alpha ArtLake',
        description: 'Coordinamento e roadmap',
        status: 'in_progress',
        priority: 'high',
        department_tag: '#Management',
        assignee_id: producerAdmin.id,
        queue_order: 0,
        estimated_minutes: 600,
        logged_minutes: 120,
        due_date: '2026-11-20T18:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-02T10:00:00Z',
        updated_at: '2026-11-02T10:00:00Z',
      },
      {
        id: 'task-art-1',
        project_id: activeProjectId,
        title: 'Modellazione 3D Foresta e Rocce',
        description: 'Asset poligonali ambientali',
        status: 'not_started',
        priority: 'medium',
        department_tag: '#3D',
        assignee_id: teamArtists[0].id,
        queue_order: 1,
        estimated_minutes: 360,
        logged_minutes: 0,
        due_date: '2026-11-22T18:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-02T10:00:00Z',
        updated_at: '2026-11-02T10:00:00Z',
      },
      {
        id: 'task-art-2',
        project_id: activeProjectId,
        title: 'Texture Baking & UV Unwrapping',
        description: 'Set mappe PBR 4K',
        status: 'not_started',
        priority: 'medium',
        department_tag: '#Art',
        assignee_id: teamArtists[1].id,
        queue_order: 2,
        estimated_minutes: 300,
        logged_minutes: 0,
        due_date: '2026-11-23T18:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-02T10:00:00Z',
        updated_at: '2026-11-02T10:00:00Z',
      },
      {
        id: 'task-art-3',
        project_id: activeProjectId,
        title: 'Lighting & Post-Processing Setup',
        description: 'Volumetrie e color grading URP',
        status: 'not_started',
        priority: 'medium',
        department_tag: '#TechArt',
        assignee_id: teamArtists[2].id,
        queue_order: 3,
        estimated_minutes: 240,
        logged_minutes: 0,
        due_date: '2026-11-24T18:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: '2026-11-02T10:00:00Z',
        updated_at: '2026-11-02T10:00:00Z',
      },
      {
        id: 'task-orphan-backlog',
        project_id: activeProjectId,
        title: 'Shader Acqua Riva & Schiuma Fluviale',
        description: 'Task orfana nel backlog senza artista assegnato',
        status: 'not_started',
        priority: 'low',
        department_tag: '#TechArt',
        assignee_id: null,
        queue_order: 99,
        estimated_minutes: 200,
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

    // Seed tasks and associate members in database
    mockSupabase.testUtils.seedDatabase({
      tasks: projectTasks,
      project_members: [
        {
          id: 'pm-admin',
          project_id: activeProjectId,
          user_id: producerAdmin.id,
          user_email: producerAdmin.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
        ...teamArtists.map((a) => ({
          id: `pm-${a.id}`,
          project_id: activeProjectId,
          user_id: a.id,
          user_email: a.email,
          invited_at: '2026-11-01T08:00:00Z',
        })),
      ],
    });

    // Close admin panel
    await user.click(toggleAdminBtn);

    // Save active project to localStorage and re-mount workspace to load newly assigned tasks
    localStorage.setItem('artlake_active_project_id', activeProjectId);
    cleanup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('ArtLake Studio Alpha');
    });

    // Switch Role View to Admin
    const adminRoleBtn = screen.getByTestId('role-btn-admin');
    await user.click(adminRoleBtn);

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('admin-team-grid')).toBeInTheDocument();
    });

    // Confirms orphan count badge displays 1 orphan task
    expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
      '1 Task Orfane (Non assegnate)'
    );

    // Assign orphan task to first available team member
    const assignOrphanBtn = screen.getByTestId('assign-orphan-btn');
    await user.click(assignOrphanBtn);

    // Confirms orphan count badge updates to 0 (all assigned)
    await waitFor(() => {
      expect(screen.getByTestId('orphan-count-text')).toHaveTextContent(
        '0 Task Orfane (Tutte assegnate ✓)'
      );
    });

    // Confirm in database that orphan task was cleanly assigned
    const snap = mockSupabase.testUtils.getSnapshot();
    const resolvedOrphan = snap.tasks.find((t) => t.id === 'task-orphan-backlog');
    expect(resolvedOrphan?.assignee_id).not.toBeNull();
  });

  // ==========================================================================
  // SCENARIO 3: Unauthorized Security Intrusion Attempt
  // ==========================================================================
  it('Scenario 3: Unauthorized Security Intrusion Attempt (Uninvited Google login, only UnauthorizedScreen, 0 data leaked, Logout)', async () => {
    const user = userEvent.setup();

    const confidentialProject = {
      id: 'proj-secret-classified',
      name: 'Classified Studio Project',
      description: 'Dati confidenziali ArtLake',
      created_by: 'internal-admin-id',
      created_at: '2026-11-01T08:00:00Z',
    };

    mockSupabase.testUtils.seedDatabase({
      projects: [confidentialProject],
      project_members: [
        {
          id: 'pm-staff',
          project_id: confidentialProject.id,
          user_id: 'internal-staff-id',
          user_email: 'staff@artlake.studio',
          invited_at: '2026-11-01T08:00:00Z',
        },
      ],
      tasks: [
        {
          id: 'task-confidential',
          project_id: confidentialProject.id,
          title: 'IP Segreta & Asset Non Rilasciati',
          description: 'Documento riservato ArtLake',
          status: 'in_progress',
          priority: 'high',
          department_tag: '#Core',
          assignee_id: 'internal-staff-id',
          queue_order: 0,
          estimated_minutes: 1000,
          logged_minutes: 200,
          due_date: null,
          start_date: null,
          blocker_reason: null,
          blocking_target: null,
          review_output_link: null,
          created_at: '2026-11-01T08:00:00Z',
          updated_at: '2026-11-01T08:00:00Z',
        },
      ],
      time_logs: [
        {
          id: 'log-confidential',
          project_id: confidentialProject.id,
          user_id: 'internal-staff-id',
          task_id: 'task-confidential',
          duration_seconds: 7200,
          is_manual_edit: false,
          year_week: '2026-W45',
          started_at: '2026-11-03T10:00:00Z',
          ended_at: '2026-11-03T12:00:00Z',
          created_at: '2026-11-03T12:00:00Z',
        },
      ],
    });

    // 1. Uninvited Google account logs in
    const intruderUser = {
      id: 'hacker-uid-666',
      email: 'hacker@external.com',
      full_name: 'External Hacker',
      role: 'user' as const,
    };

    mockSupabase.testUtils.setMockUser(intruderUser);

    render(<App />);

    // 2. App renders ONLY the UnauthorizedScreen
    await waitFor(() => {
      expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
    });

    const unauthorizedMessage = screen.getByTestId('unauthorized-message');
    expect(unauthorizedMessage).toHaveTextContent(
      "Account non autorizzato. Chiedi all'amministratore di invitarti a un progetto"
    );

    const logoutBtn = screen.getByTestId('logout-btn');
    expect(logoutBtn).toBeInTheDocument();

    // 3. Confirm 0 studio UI components or sensitive views are accessible
    expect(screen.queryByTestId('workspace-shell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('topbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kanban-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gantt-view')).not.toBeInTheDocument();

    // 4. Direct mockSupabase queries return 0 rows for uninvited client (RLS enforcement)
    const { data: projectsData } = await mockSupabase.from('projects').select('*');
    expect(projectsData).toEqual([]);

    const { data: tasksData } = await mockSupabase.from('tasks').select('*');
    expect(tasksData).toEqual([]);

    const { data: timeLogsData } = await mockSupabase.from('time_logs').select('*');
    expect(timeLogsData).toEqual([]);

    // 5. Logout returns user back to clean Google OAuth Login Gate
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByTestId('login-gate')).toBeInTheDocument();
      expect(screen.getByTestId('google-login-btn')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('unauthorized-screen')).not.toBeInTheDocument();
  });

  // ==========================================================================
  // SCENARIO 4: Weekly Hours Audit & Rectification
  // ==========================================================================
  it('Scenario 4: Weekly Hours Audit & Rectification (Manual ✎ edit to 2h 30m, instant weekly sum, historical avg strictly excludes current week)', async () => {
    const user = userEvent.setup();

    const artistUser = {
      id: 'artist-audit-id',
      email: 'artist@artlake.studio',
      full_name: 'Studio Artist',
      role: 'user' as const,
      department: '#Art',
    };

    const project = {
      id: 'project-artlake-alpha',
      name: 'ArtLake Studio Alpha',
      description: 'Progetto di produzione',
      created_by: 'lead-producer-id',
      created_at: '2026-11-01T08:00:00Z',
    };

    const activeTask: TaskRow = {
      id: 'task-shader-graph',
      project_id: project.id,
      title: 'Water Foam Shader Graph Refactoring',
      description: 'Ottimizzazione passaggi HLSL',
      status: 'in_progress',
      priority: 'high',
      department_tag: '#TechArt',
      assignee_id: artistUser.id,
      queue_order: 0,
      estimated_minutes: 600,
      logged_minutes: 60,
      due_date: '2026-11-20T18:00:00Z',
      start_date: null,
      blocker_reason: null,
      blocking_target: null,
      review_output_link: null,
      created_at: '2026-11-01T08:00:00Z',
      updated_at: '2026-11-01T08:00:00Z',
    };

    const currentIsoWeek = getIsoYearWeek(); // e.g. "2026-W45"

    // Setup Historical Past Weeks strictly before current week:
    // Past Week 1: 36,000s = 10h
    // Past Week 2: 72,000s = 20h
    // Expected Historical Average = (10h + 20h) / 2 = 15h/sett
    // Current Week existing log: 3,600s = 1h 0m
    const seedLogs = [
      {
        id: 'hist-log-1',
        project_id: project.id,
        user_id: artistUser.id,
        task_id: activeTask.id,
        duration_seconds: 36000,
        is_manual_edit: false,
        year_week: '2026-W40',
        started_at: '2026-10-01T09:00:00Z',
        ended_at: '2026-10-01T19:00:00Z',
        created_at: '2026-10-01T19:00:00Z',
      },
      {
        id: 'hist-log-2',
        project_id: project.id,
        user_id: artistUser.id,
        task_id: activeTask.id,
        duration_seconds: 72000,
        is_manual_edit: false,
        year_week: '2026-W41',
        started_at: '2026-10-08T09:00:00Z',
        ended_at: '2026-10-09T05:00:00Z',
        created_at: '2026-10-09T05:00:00Z',
      },
      {
        id: 'current-week-initial-log',
        project_id: project.id,
        user_id: artistUser.id,
        task_id: activeTask.id,
        duration_seconds: 3600,
        is_manual_edit: false,
        year_week: currentIsoWeek,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    mockSupabase.testUtils.seedDatabase({
      profiles: [
        {
          id: artistUser.id,
          email: artistUser.email,
          full_name: artistUser.full_name,
          initials: 'SA',
          avatar_url: null,
          role: artistUser.role,
          department: artistUser.department,
          active_task_id: activeTask.id,
          created_at: '2026-11-01T08:00:00Z',
        },
      ],
      projects: [project],
      project_members: [
        {
          id: 'pm-audit',
          project_id: project.id,
          user_id: artistUser.id,
          user_email: artistUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
      ],
      tasks: [activeTask],
      subtasks: [],
      time_logs: seedLogs,
    });

    mockSupabase.testUtils.setMockUser(artistUser);
    localStorage.setItem('artlake_active_project_id', project.id);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('timer-weekly-hours')).toHaveTextContent('1h 0m');
      expect(screen.getByTestId('timer-avg-hours')).toHaveTextContent('15h/sett');
    });

    // 1. Artist opens manual edit modal (✎) on Top Bar Timer Pill
    const editBtn = screen.getByTestId('timer-edit-btn');
    await user.click(editBtn);

    const modal = await screen.findByTestId('time-edit-modal');
    expect(modal).toBeInTheDocument();

    // 2. Rectifies time to 2h 30m ('02:30:00')
    const manualInput = screen.getByTestId('manual-time-input');
    await user.clear(manualInput);
    await user.type(manualInput, '02:30:00');

    const saveBtn = screen.getByTestId('save-time-edit-btn');
    await user.click(saveBtn);

    // 3. Modal closes cleanly
    await waitFor(() => {
      expect(screen.queryByTestId('time-edit-modal')).toBeNull();
    });

    // Timer display updates to rectified elapsed time
    expect(screen.getByTestId('timer-display')).toHaveTextContent('02:30:00');

    // 4. Confirms weekly total updates immediately: 1h 0m + 2h 30m = 3h 30m
    await waitFor(() => {
      expect(screen.getByTestId('timer-weekly-hours')).toHaveTextContent('3h 30m');
    });

    // 5. Confirms historical average strictly excludes current week and stays at 15h/sett
    expect(screen.getByTestId('timer-avg-hours')).toHaveTextContent('15h/sett');

    // 6. Confirms database time_logs record was written with is_manual_edit = true and 9000 seconds
    const snap = mockSupabase.testUtils.getSnapshot();
    const manualLog = snap.time_logs.find((l) => l.is_manual_edit === true);
    expect(manualLog).toBeDefined();
    expect(manualLog?.duration_seconds).toBe(9000); // 2h * 3600 + 30m * 60 = 9000s
    expect(manualLog?.task_id).toBe(activeTask.id);
  });

  // ==========================================================================
  // SCENARIO 5: Cross-View Real-Time Sync
  // ==========================================================================
  it('Scenario 5: Cross-View Real-Time Sync (Kanban card move to Completata, seamless sync across Gantt and User Dashboard without reload)', async () => {
    const user = userEvent.setup();

    const artistUser = {
      id: 'artist-sync-id',
      email: 'artist@artlake.studio',
      full_name: 'Studio Artist',
      role: 'user' as const,
      department: '#TechArt',
    };

    const project = {
      id: 'project-artlake-alpha',
      name: 'ArtLake Studio Alpha',
      description: 'Progetto di produzione',
      created_by: 'lead-producer-id',
      created_at: '2026-11-01T08:00:00Z',
    };

    const taskInReview: TaskRow = {
      id: 'task-sync-review',
      project_id: project.id,
      title: 'Lighting Shaders & Volumetric Fog URP',
      description: 'Passaggio al Render Graph Unity 6',
      status: 'in_review',
      priority: 'high',
      department_tag: '#TechArt',
      assignee_id: artistUser.id,
      queue_order: 0,
      estimated_minutes: 420,
      logged_minutes: 380,
      due_date: '2026-11-18T18:00:00Z',
      start_date: null,
      blocker_reason: null,
      blocking_target: 'Lighting Team',
      review_output_link: 'https://github.com/artlake/pull/42',
      created_at: '2026-11-01T08:00:00Z',
      updated_at: '2026-11-01T08:00:00Z',
    };

    const taskQueue: TaskRow = {
      id: 'task-sync-queue',
      project_id: project.id,
      title: 'Audio Reverb Snapshots Cave Scene',
      description: 'Configurazione snapshot mixer audio',
      status: 'not_started',
      priority: 'medium',
      department_tag: '#Audio',
      assignee_id: artistUser.id,
      queue_order: 1,
      estimated_minutes: 240,
      logged_minutes: 0,
      due_date: '2026-11-20T18:00:00Z',
      start_date: null,
      blocker_reason: null,
      blocking_target: null,
      review_output_link: null,
      created_at: '2026-11-01T08:00:00Z',
      updated_at: '2026-11-01T08:00:00Z',
    };

    mockSupabase.testUtils.seedDatabase({
      profiles: [
        {
          id: artistUser.id,
          email: artistUser.email,
          full_name: artistUser.full_name,
          initials: 'SA',
          avatar_url: null,
          role: artistUser.role,
          department: artistUser.department,
          active_task_id: taskInReview.id,
          created_at: '2026-11-01T08:00:00Z',
        },
      ],
      projects: [project],
      project_members: [
        {
          id: 'pm-sync',
          project_id: project.id,
          user_id: artistUser.id,
          user_email: artistUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
      ],
      tasks: [taskInReview, taskQueue],
      subtasks: [],
      time_logs: [],
    });

    mockSupabase.testUtils.setMockUser(artistUser);
    localStorage.setItem('artlake_active_project_id', project.id);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
    });

    // Initial state: Hero task is in 'In revisione'
    const statusSelect = screen.getByTestId('task-status-select') as HTMLSelectElement;
    expect(statusSelect.value).toBe('In revisione');

    // 1. Navigate to Kanban View via Navigation Pill
    const kanbanNavBtn = screen.getByTestId('nav-pill-kanban');
    await user.click(kanbanNavBtn);

    await waitFor(() => {
      expect(screen.getByTestId('kanban-view')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    });

    // In Kanban, card is in 'In revisione' column
    const inReviewCol = screen.getByTestId('kanban-col-in_review');
    expect(inReviewCol).toHaveTextContent('Lighting Shaders & Volumetric Fog URP');

    // 2. Artist advances task from 'In revisione' to 'Completata'
    const moveBtn = screen.getByTestId('kanban-move-task-sync-review');
    expect(moveBtn).toHaveTextContent('→ Completata');
    await user.click(moveBtn);

    // Verify card moved into 'Completata' column
    const completedCol = screen.getByTestId('kanban-col-completed');
    expect(completedCol).toHaveTextContent('Lighting Shaders & Volumetric Fog URP');

    // 3. Navigate to Gantt View
    const ganttNavBtn = screen.getByTestId('nav-pill-gantt');
    await user.click(ganttNavBtn);

    await waitFor(() => {
      expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
      expect(screen.getByTestId('gantt-container')).toBeInTheDocument();
    });

    // Row exists and bar reflects completed state (emerald styling)
    const ganttRow = screen.getByTestId('gantt-row-task-sync-review');
    expect(ganttRow).toBeInTheDocument();
    expect(ganttRow.querySelector('.bg-gradient-to-r')).toHaveClass('from-[#059669]');

    // 4. Navigate back to User Dashboard
    const dashboardNavBtn = screen.getByTestId('nav-pill-dashboard');
    await user.click(dashboardNavBtn);

    await waitFor(() => {
      expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
    });

    // Verify task status is synchronized to 'Completata' without page reload
    const updatedStatusSelect = screen.getByTestId('task-status-select') as HTMLSelectElement;
    expect(updatedStatusSelect.value).toBe('Completata');

    // 5. Database state confirms synchronization
    const snap = mockSupabase.testUtils.getSnapshot();
    const updatedDbTask = snap.tasks.find((t) => t.id === 'task-sync-review');
    expect(updatedDbTask?.status).toBe('completed');
  });

  // ==========================================================================
  // SCENARIO 6: Atomic Optimistic Task Switch
  // ==========================================================================
  it('Scenario 6: Atomic Optimistic Task Switch (Timer running on Task A, 0ms promote to Task B, cleanly commits Task A time, queue reorders)', async () => {
    const user = userEvent.setup();

    const artistUser = {
      id: 'artist-switch-id',
      email: 'artist@artlake.studio',
      full_name: 'Studio Artist',
      role: 'user' as const,
      department: '#TechArt',
    };

    const project = {
      id: 'project-artlake-alpha',
      name: 'ArtLake Studio Alpha',
      description: 'Progetto di produzione',
      created_by: 'lead-producer-id',
      created_at: '2026-11-01T08:00:00Z',
    };

    const taskA: TaskRow = {
      id: 'task-a-physics',
      project_id: project.id,
      title: 'Task A: Shader & PhysX Collision Setup',
      description: 'Ottimizzazione mesh collider',
      status: 'in_progress',
      priority: 'high',
      department_tag: '#TechArt',
      assignee_id: artistUser.id,
      queue_order: 0,
      estimated_minutes: 480,
      logged_minutes: 0,
      due_date: '2026-11-16T18:00:00Z',
      start_date: null,
      blocker_reason: null,
      blocking_target: null,
      review_output_link: null,
      created_at: '2026-11-01T08:00:00Z',
      updated_at: '2026-11-01T08:00:00Z',
    };

    const taskB: TaskRow = {
      id: 'task-b-vivox',
      project_id: project.id,
      title: 'Task B: Vivox Voice Chat Spatial Audio',
      description: 'Integrazione canali radio posizionali',
      status: 'not_started',
      priority: 'medium',
      department_tag: '#Audio',
      assignee_id: artistUser.id,
      queue_order: 1,
      estimated_minutes: 360,
      logged_minutes: 0,
      due_date: '2026-11-18T18:00:00Z',
      start_date: null,
      blocker_reason: null,
      blocking_target: 'Multiplayer Team',
      review_output_link: null,
      created_at: '2026-11-01T08:00:00Z',
      updated_at: '2026-11-01T08:00:00Z',
    };

    mockSupabase.testUtils.seedDatabase({
      profiles: [
        {
          id: artistUser.id,
          email: artistUser.email,
          full_name: artistUser.full_name,
          initials: 'SA',
          avatar_url: null,
          role: artistUser.role,
          department: artistUser.department,
          active_task_id: taskA.id,
          created_at: '2026-11-01T08:00:00Z',
        },
      ],
      projects: [project],
      project_members: [
        {
          id: 'pm-switch',
          project_id: project.id,
          user_id: artistUser.id,
          user_email: artistUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
      ],
      tasks: [taskA, taskB],
      subtasks: [],
      time_logs: [],
    });

    mockSupabase.testUtils.setMockUser(artistUser);
    localStorage.setItem('artlake_active_project_id', project.id);

    render(<App />);

    // 1. Initial State: Task A is the active Hero task (70%)
    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('active-task-title')).toHaveTextContent(
        'Task A: Shader & PhysX Collision Setup'
      );
    });

    // Task B is in the Priority Queue column (30%)
    expect(screen.getByTestId('queue-card-task-b-vivox')).toBeInTheDocument();
    const promoteBtn = screen.getByTestId('promote-btn-task-b-vivox');
    expect(promoteBtn).toHaveTextContent('Passa a questa task →');

    // 2. Artist starts timer on Task A
    const timerToggleBtn = screen.getByTestId('timer-toggle-btn');
    await user.click(timerToggleBtn);

    await waitFor(() => {
      expect(screen.getByTestId('timer-btn-text')).toHaveTextContent('Pausa');
    });
    expect(screen.getByTestId('timer-status-dot')).toHaveClass('bg-emerald');

    // Accumulate at least 1.1s of elapsed session time on Task A
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // 3. Artist clicks 'Passa a questa task →' on Task B in Priority Queue
    await user.click(promoteBtn);

    // 4. Instant 0ms perceived latency: Task B immediately becomes the new active Hero task
    expect(screen.getByTestId('active-task-title')).toHaveTextContent(
      'Task B: Vivox Voice Chat Spatial Audio'
    );

    // Previous Task A is instantly demoted to the Priority Queue column
    expect(screen.getByTestId('queue-card-task-a-physics')).toBeInTheDocument();

    // 5. Verify Task A timer was cleanly stopped and committed its duration to time_logs
    await waitFor(() => {
      const snap = mockSupabase.testUtils.getSnapshot();
      const taskALogs = snap.time_logs.filter((l) => l.task_id === taskA.id);
      expect(taskALogs.length).toBeGreaterThan(0);
      expect(taskALogs[0].duration_seconds).toBeGreaterThanOrEqual(1);
      expect(taskALogs[0].is_manual_edit).toBe(false);

      // Verify profile active_task_id updated to Task B
      const profile = snap.profiles.find((p) => p.id === artistUser.id);
      expect(profile?.active_task_id).toBe(taskB.id);

      // Verify queue order reordered
      const dbTaskB = snap.tasks.find((t) => t.id === taskB.id);
      const dbTaskA = snap.tasks.find((t) => t.id === taskA.id);
      expect(dbTaskB?.queue_order).toBe(0);
      expect(dbTaskA?.queue_order).toBe(1);
    });
  });
});
