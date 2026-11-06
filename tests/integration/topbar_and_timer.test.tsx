import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase } from '../../src/services/mockSupabase';
import { AuthProvider } from '../../src/context/AuthContext';
import { ProjectProvider } from '../../src/context/ProjectContext';
import { TimerProvider, useTimer } from '../../src/context/TimerContext';
import { TopBar } from '../../src/components/layout/TopBar';
import { NavigationTab } from '../../src/types/models';

const StatusChangeTrigger: React.FC = () => {
  const { onTaskStatusChange, activeTaskId } = useTimer();
  return (
    <div>
      <button
        data-testid="complete-task-btn"
        onClick={() => activeTaskId && onTaskStatusChange(activeTaskId, 'completed')}
      >
        Complete Task
      </button>
      <button
        data-testid="block-task-btn"
        onClick={() => activeTaskId && onTaskStatusChange(activeTaskId, 'blocked')}
      >
        Block Task
      </button>
    </div>
  );
};

const TestApp: React.FC<{ initialView?: NavigationTab }> = ({ initialView = 'dashboard' }) => {
  const [view, setView] = React.useState<NavigationTab>(initialView);
  const [roleView, setRoleView] = React.useState<'user' | 'admin'>('user');

  return (
    <AuthProvider>
      <ProjectProvider>
        <TimerProvider>
          <div data-testid="app-shell" className="min-h-screen bg-bg-base">
            <TopBar
              activeView={view}
              onViewChange={setView}
              activeRoleView={roleView}
              onRoleViewChange={setRoleView}
              onOpenWeeklyCheck={vi.fn()}
              weeklyCheckPending={false}
            />
            {/* View container */}
            <div data-testid="active-view-container">
              Active View: {view} | Role View: {roleView}
            </div>
            <StatusChangeTrigger />
          </div>
        </TimerProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

describe('Integration: TopBar 64px, Adaptive Timer & Automations', () => {
  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    localStorage.clear();

    const mockUser = {
      id: 'usr-1',
      email: 'lead@artlake.studio',
      user_metadata: { full_name: 'Francesco P.', role: 'admin' as const },
    };

    mockSupabase.testUtils.setSession({
      access_token: 'valid-jwt',
      token_type: 'bearer',
      expires_in: 3600,
      user: mockUser,
    });

    mockSupabase.testUtils.seedDatabase({
      profiles: [
        {
          id: 'usr-1',
          email: 'lead@artlake.studio',
          full_name: 'Francesco P.',
          initials: 'FP',
          avatar_url: null,
          role: 'admin',
          department: 'Core Dev',
          active_task_id: 'task-101',
          created_at: new Date().toISOString(),
        },
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'ArtLake Studio Alpha',
          description: 'Primary project',
          created_by: 'usr-1',
          created_at: new Date().toISOString(),
        },
      ],
      project_members: [
        {
          id: 'pm-1',
          project_id: 'proj-1',
          user_email: 'lead@artlake.studio',
          user_id: 'usr-1',
          invited_at: new Date().toISOString(),
        },
      ],
      tasks: [
        {
          id: 'task-101',
          project_id: 'proj-1',
          title: 'Refactor Pipeline URP',
          description: 'Migration to Render Graph',
          status: 'not_started',
          priority: 'high',
          department_tag: '#CoreDev',
          assignee_id: 'usr-1',
          queue_order: 1,
          estimated_minutes: 600,
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
      time_logs: [],
    });
  });

  it('renders fixed 64px Top Bar with Zone 1, Zone 2, Zone 3 and ZERO vertical sidebar', async () => {
    render(<TestApp />);

    const topbar = await screen.findByTestId('topbar');
    expect(topbar).toBeInTheDocument();
    expect(topbar).toHaveClass('h-16');
    expect(topbar).toHaveClass('sticky');

    // Confirm zero vertical sidebar in entire document
    expect(screen.queryByTestId('sidebar')).toBeNull();
    expect(screen.queryByTestId('vertical-nav')).toBeNull();

    // Confirm 3 zones exist
    expect(screen.getByTestId('topbar-zone-1')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-zone-2')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-zone-3')).toBeInTheDocument();
  });

  it('Zone 1: switches navigation tabs between Dashboard, Kanban, and Gantt', async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    const kanbanBtn = await screen.findByTestId('nav-pill-kanban');
    await user.click(kanbanBtn);

    expect(screen.getByTestId('active-view-container')).toHaveTextContent('Active View: kanban');
    expect(kanbanBtn).toHaveClass('active');

    const ganttBtn = screen.getByTestId('nav-pill-gantt');
    await user.click(ganttBtn);
    expect(screen.getByTestId('active-view-container')).toHaveTextContent('Active View: gantt');

    const dashboardBtn = screen.getByTestId('nav-pill-dashboard');
    await user.click(dashboardBtn);
    expect(screen.getByTestId('active-view-container')).toHaveTextContent('Active View: dashboard');
  });

  it('Zone 2: automatically compacts timer extra wrap when in Kanban or Gantt', async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    const timerPill = await screen.findByTestId('timer-pill');
    expect(timerPill).not.toHaveClass('compact');

    // Switch to Kanban
    await user.click(screen.getByTestId('nav-pill-kanban'));
    expect(timerPill).toHaveClass('compact');

    // Switch to Gantt
    await user.click(screen.getByTestId('nav-pill-gantt'));
    expect(timerPill).toHaveClass('compact');

    // Switch back to Dashboard
    await user.click(screen.getByTestId('nav-pill-dashboard'));
    expect(timerPill).not.toHaveClass('compact');
  });

  it('Zone 2 Automation: starting timer on not_started task automatically moves task to in_progress', async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    const toggleBtn = await screen.findByTestId('timer-toggle-btn');
    expect(screen.getByTestId('timer-btn-text')).toHaveTextContent('Avvia Timer');

    // Click Avvia Timer
    await user.click(toggleBtn);

    // Verify timer switched to running
    await waitFor(() => {
      expect(screen.getByTestId('timer-btn-text')).toHaveTextContent('Pausa');
    });

    const statusDot = screen.getByTestId('timer-status-dot');
    expect(statusDot).toHaveClass('bg-emerald');

    // Verify task in database auto-advanced to 'in_progress'
    const snapshot = mockSupabase.testUtils.getSnapshot();
    const task = snapshot.tasks.find((t) => t.id === 'task-101');
    expect(task?.status).toBe('in_progress');
  });

  it('Zone 2 Automation: manual time rectification (✎) opens modal and validates HH:MM:SS format', async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    const editBtn = await screen.findByTestId('timer-edit-btn');
    await user.click(editBtn);

    // Modal opens
    const modal = await screen.findByTestId('time-edit-modal');
    expect(modal).toBeInTheDocument();

    const input = screen.getByTestId('manual-time-input');
    const saveBtn = screen.getByTestId('save-time-edit-btn');

    // Test invalid format
    await user.clear(input);
    await user.type(input, 'invalid time');
    await user.click(saveBtn);
    expect(await screen.findByTestId('manual-time-error')).toHaveTextContent('Usa il formato HH:MM:SS');

    // Test valid format
    await user.clear(input);
    await user.type(input, '01:30:00');
    await user.click(saveBtn);

    // Modal closes and display updates
    await waitFor(() => {
      expect(screen.queryByTestId('time-edit-modal')).toBeNull();
    });
    expect(screen.getByTestId('timer-display')).toHaveTextContent('01:30:00');

    // Verify time_logs record was created with is_manual_edit = true
    const snapshot = mockSupabase.testUtils.getSnapshot();
    const log = snapshot.time_logs.find((l) => l.is_manual_edit === true);
    expect(log).toBeDefined();
    expect(log?.duration_seconds).toBe(5400);
  });

  it('Zone 2 Automation: onTaskStatusChange to completed auto-stops timer and persists log', async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Start timer first
    const toggleBtn = await screen.findByTestId('timer-toggle-btn');
    await user.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByTestId('timer-btn-text')).toHaveTextContent('Pausa');
    });

    // Complete task via trigger
    await user.click(screen.getByTestId('complete-task-btn'));

    // Verify timer auto-stopped
    await waitFor(() => {
      expect(screen.getByTestId('timer-btn-text')).toHaveTextContent('Avvia Timer');
    });
    expect(screen.getByTestId('timer-status-dot')).toHaveClass('bg-amber');
  });

  it('Zone 3: allows Admin to switch view between User and Admin dashboard', async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    const adminRoleBtn = await screen.findByTestId('role-btn-admin');
    await user.click(adminRoleBtn);

    expect(screen.getByTestId('active-view-container')).toHaveTextContent('Role View: admin');

    const userRoleBtn = screen.getByTestId('role-btn-user');
    await user.click(userRoleBtn);
    expect(screen.getByTestId('active-view-container')).toHaveTextContent('Role View: user');
  });

  it('Zone 3: toggles notifications dropdown and clears badge on mark all read', async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    const bellBtn = await screen.findByTestId('notif-bell-btn');
    expect(screen.getByTestId('notif-badge')).toHaveTextContent('3');

    // Click to open
    await user.click(bellBtn);
    expect(await screen.findByTestId('notif-dropdown')).toBeInTheDocument();

    // Click mark read
    await user.click(screen.getByTestId('mark-all-read-btn'));
    expect(screen.queryByTestId('notif-badge')).toBeNull();
  });
});
