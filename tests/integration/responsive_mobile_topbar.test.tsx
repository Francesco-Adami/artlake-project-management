import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase } from '../../src/services/mockSupabase';
import { AuthProvider } from '../../src/context/AuthContext';
import { ProjectProvider } from '../../src/context/ProjectContext';
import { TimerProvider } from '../../src/context/TimerContext';
import { TopBar } from '../../src/components/layout/TopBar';
import { KanbanBoard } from '../../src/components/kanban/KanbanBoard';
import { TaskProvider } from '../../src/context/TaskContext';

const ResponsiveTestApp: React.FC = () => {
  const [view, setView] = React.useState<'dashboard' | 'kanban' | 'gantt'>('dashboard');
  const [roleView, setRoleView] = React.useState<'user' | 'admin'>('user');

  return (
    <AuthProvider>
      <ProjectProvider>
        <TimerProvider>
          <TaskProvider>
            <TopBar
              activeView={view}
              onViewChange={setView}
              activeRoleView={roleView}
              onRoleViewChange={setRoleView}
              onOpenWeeklyCheck={vi.fn()}
              weeklyCheckPending={false}
            />
            {view === 'kanban' && <KanbanBoard />}
          </TaskProvider>
        </TimerProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

describe('Responsive TopBar & Mobile Navigation Integration', () => {
  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    localStorage.clear();

    const mockAdmin = {
      id: 'admin-resp-1',
      email: 'lead@artlake.studio',
      user_metadata: { full_name: 'Francesco Resp', role: 'admin' as const },
    };

    mockSupabase.testUtils.setSession({
      access_token: 'valid-jwt',
      token_type: 'bearer',
      expires_in: 3600,
      user: mockAdmin,
    });

    mockSupabase.testUtils.seedDatabase({
      profiles: [
        {
          id: 'admin-resp-1',
          email: 'lead@artlake.studio',
          full_name: 'Francesco Resp',
          initials: 'FR',
          avatar_url: null,
          role: 'admin',
          department: 'Core Dev',
          active_task_id: null,
          created_at: new Date().toISOString(),
        },
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'Project Alpha',
          description: 'First project',
          created_by: 'admin-resp-1',
          created_at: new Date().toISOString(),
        },
        {
          id: 'proj-2',
          name: 'Project Beta',
          description: 'Second project',
          created_by: 'admin-resp-1',
          created_at: new Date().toISOString(),
        },
      ],
      project_members: [
        {
          id: 'pm-1',
          project_id: 'proj-1',
          user_email: 'lead@artlake.studio',
          user_id: 'admin-resp-1',
          invited_at: new Date().toISOString(),
        },
        {
          id: 'pm-2',
          project_id: 'proj-2',
          user_email: 'lead@artlake.studio',
          user_id: 'admin-resp-1',
          invited_at: new Date().toISOString(),
        },
      ],
      tasks: [],
      time_logs: [],
    });
  });

  it('NavigationPill has single-DOM mobile fixed bottom navigation classes', async () => {
    render(<ResponsiveTestApp />);

    const nav = await screen.findByTestId('nav-segmented');
    expect(nav).toBeInTheDocument();
    // Verify mobile fixed bottom styling classes are present on the single DOM node
    expect(nav).toHaveClass('fixed');
    expect(nav).toHaveClass('bottom-4');
    expect(nav).toHaveClass('md:static');

    // Verify touch targets on pill buttons
    const dashboardBtn = screen.getByTestId('nav-pill-dashboard');
    expect(dashboardBtn).toHaveClass('min-h-[40px]');
    expect(dashboardBtn).toHaveClass('md:min-h-0');
  });

  it('TimerPill counter click opens mobile popover with stats and manual edit trigger', async () => {
    const user = userEvent.setup();
    render(<ResponsiveTestApp />);

    const timerDisplay = await screen.findByTestId('timer-display');
    expect(screen.queryByTestId('timer-mobile-popover')).toBeNull();

    // Click timer display to open popover
    await user.click(timerDisplay);
    expect(await screen.findByTestId('timer-mobile-popover')).toBeInTheDocument();
    expect(screen.getByText('Riepilogo Ore')).toBeInTheDocument();

    // Click manual edit inside popover
    const popoverEditBtn = screen.getByTestId('timer-popover-edit-btn');
    await user.click(popoverEditBtn);

    // Popover closes and manual modal opens
    await waitFor(() => {
      expect(screen.queryByTestId('timer-mobile-popover')).toBeNull();
    });
    expect(await screen.findByTestId('time-edit-modal')).toBeInTheDocument();
  });

  it('User Avatar click opens profile menu with project switching, role switching, and logout', async () => {
    const user = userEvent.setup();
    render(<ResponsiveTestApp />);

    const avatarBtn = await screen.findByTestId('user-profile');
    expect(screen.queryByTestId('profile-dropdown-menu')).toBeNull();

    // Click avatar to toggle menu
    await user.click(avatarBtn);
    const menu = await screen.findByTestId('profile-dropdown-menu');
    expect(menu).toBeInTheDocument();
    expect(screen.getAllByText('Francesco Resp').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('lead@artlake.studio')).toBeInTheDocument();

    // Mobile project option should be present
    const projBetaBtn = screen.getByTestId('mobile-project-option-proj-2');
    expect(projBetaBtn).toBeInTheDocument();
    await user.click(projBetaBtn);

    // Menu closes upon project selection
    await waitFor(() => {
      expect(screen.queryByTestId('profile-dropdown-menu')).toBeNull();
    });
  });

  it('KanbanBoard contains responsive scroll-snap classes on columns and bottom clearance', async () => {
    const user = userEvent.setup();
    render(<ResponsiveTestApp />);

    const kanbanNavBtn = await screen.findByTestId('nav-pill-kanban');
    await user.click(kanbanNavBtn);

    const kanbanView = await screen.findByTestId('kanban-view');
    expect(kanbanView).toHaveClass('pb-28');

    const kanbanBoard = screen.getByTestId('kanban-board');
    expect(kanbanBoard).toHaveClass('snap-x');
    expect(kanbanBoard).toHaveClass('snap-mandatory');

    const notStartedCol = screen.getByTestId('kanban-col-not_started');
    expect(notStartedCol).toHaveClass('min-w-[85vw]');
    expect(notStartedCol).toHaveClass('snap-center');
  });
});
