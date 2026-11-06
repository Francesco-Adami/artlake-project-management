import React, { useEffect } from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { mockSupabase } from '../../src/services/mockSupabase';
import { AuthProvider } from '../../src/context/AuthContext';
import { ProjectProvider } from '../../src/context/ProjectContext';
import { TimerProvider, useTimer } from '../../src/context/TimerContext';
import { TaskStatus } from '../../src/types/models';

// Test consumer exposing full TimerContext actions and states for empirical probe
const TimerStressHarness: React.FC<{
  onStateUpdate?: (state: ReturnType<typeof useTimer>) => void;
}> = ({ onStateUpdate }) => {
  const timer = useTimer();

  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate(timer);
    }
  }, [timer, onStateUpdate]);

  return (
    <div data-testid="stress-harness">
      <div data-testid="active-task-id">{timer.activeTaskId || 'none'}</div>
      <div data-testid="active-task-title">{timer.activeTaskTitle || 'none'}</div>
      <div data-testid="active-task-status">{timer.activeTaskStatus || 'none'}</div>
      <div data-testid="is-running">{timer.isRunning ? 'true' : 'false'}</div>
      <div data-testid="elapsed-seconds">{timer.elapsedSeconds}</div>
      <div data-testid="formatted-elapsed">{timer.formattedElapsed}</div>
      <div data-testid="toast-msg">{timer.toastMessage || 'none'}</div>
      <div data-testid="weekly-current">{timer.weeklyStats.currentWeekFormatted}</div>
      <div data-testid="weekly-avg">{timer.weeklyStats.historicalAvgFormatted}</div>

      <button data-testid="btn-start" onClick={() => timer.startTimer()}>
        Start
      </button>
      <button data-testid="btn-stop" onClick={() => timer.stopTimer()}>
        Stop
      </button>
      <button data-testid="btn-toggle" onClick={() => timer.toggleTimer()}>
        Toggle
      </button>
      <button
        data-testid="btn-start-task-2"
        onClick={() => timer.startTimer('task-102', 'Secondary Task')}
      >
        Start Task 2
      </button>
      <button
        data-testid="btn-set-task-2"
        onClick={() =>
          timer.setActiveTask({ id: 'task-102', title: 'Secondary Task', status: 'not_started' })
        }
      >
        Set Task 2
      </button>
      <button
        data-testid="btn-set-task-1"
        onClick={() =>
          timer.setActiveTask({ id: 'task-101', title: 'Primary Task', status: 'in_progress' })
        }
      >
        Set Task 1
      </button>
      <button
        data-testid="btn-manual-edit-500"
        onClick={() => timer.updateManualTime(500)}
      >
        Manual 500s
      </button>
    </div>
  );
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <ProjectProvider>
        <TimerProvider>{ui}</TimerProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

describe('Empirical Challenger: Timer Automations Stress Harness', () => {
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
          title: 'Primary Task',
          description: 'Primary task description',
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
        {
          id: 'task-102',
          project_id: 'proj-1',
          title: 'Secondary Task',
          description: 'Secondary task description',
          status: 'not_started',
          priority: 'medium',
          department_tag: '#CoreDev',
          assignee_id: 'usr-1',
          queue_order: 2,
          estimated_minutes: 300,
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // VECTOR 1: Rapid Status Flipping
  // =========================================================================
  describe('Vector 1: Rapid Status Flipping', () => {
    it('handles high-frequency sequential status transitions without corrupted state or unhandled rejections', async () => {
      let timerRef: ReturnType<typeof useTimer> | null = null;
      renderWithProviders(<TimerStressHarness onStateUpdate={(t) => (timerRef = t)} />);

      await waitFor(() => {
        expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-101');
      });

      // Start timer
      await act(async () => {
        await timerRef!.startTimer();
      });
      expect(screen.getByTestId('is-running')).toHaveTextContent('true');
      expect(screen.getByTestId('active-task-status')).toHaveTextContent('in_progress');

      // Rapidly flip statuses back and forth: blocked -> in_progress -> in_review -> in_progress -> completed
      const transitions: TaskStatus[] = [
        'blocked',
        'in_progress',
        'in_review',
        'in_progress',
        'blocked',
        'in_progress',
        'completed',
      ];

      for (const st of transitions) {
        await act(async () => {
          await timerRef!.onTaskStatusChange('task-101', st);
        });
      }

      // Final state must be completed and NOT running
      expect(screen.getByTestId('active-task-status')).toHaveTextContent('completed');
      expect(screen.getByTestId('is-running')).toHaveTextContent('false');
    });

    it('handles concurrent/race status change promises gracefully without duplicate or orphaned logs', async () => {
      let timerRef: ReturnType<typeof useTimer> | null = null;
      renderWithProviders(<TimerStressHarness onStateUpdate={(t) => (timerRef = t)} />);

      await waitFor(() => {
        expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-101');
      });

      await act(async () => {
        await timerRef!.startTimer();
      });

      // Fire concurrent status changes simultaneously
      await act(async () => {
        await Promise.all([
          timerRef!.onTaskStatusChange('task-101', 'blocked'),
          timerRef!.onTaskStatusChange('task-101', 'completed'),
        ]);
      });

      // Timer should be stopped
      expect(screen.getByTestId('is-running')).toHaveTextContent('false');

      // Database state should have only valid logs, no NaN or negative durations
      const snapshot = mockSupabase.testUtils.getSnapshot();
      for (const log of snapshot.time_logs) {
        expect(log.duration_seconds).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(log.duration_seconds)).toBe(true);
      }
    });

    it('ignores status change notifications directed to non-active tasks', async () => {
      let timerRef: ReturnType<typeof useTimer> | null = null;
      renderWithProviders(<TimerStressHarness onStateUpdate={(t) => (timerRef = t)} />);

      await waitFor(() => {
        expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-101');
      });

      await act(async () => {
        await timerRef!.startTimer();
      });
      expect(screen.getByTestId('is-running')).toHaveTextContent('true');

      // Status change for task-102 should NOT stop task-101's timer
      await act(async () => {
        await timerRef!.onTaskStatusChange('task-102', 'completed');
      });

      expect(screen.getByTestId('is-running')).toHaveTextContent('true');
      expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-101');
    });
  });

  // =========================================================================
  // VECTOR 2: Task Switching with Running Timer
  // =========================================================================
  describe('Vector 2: Task Switching with Running Timer', () => {
    it('calling startTimer directly on Task 2 while Task 1 is running switches tasks and auto-advances Task 2 if not_started', async () => {
      let timerRef: ReturnType<typeof useTimer> | null = null;
      renderWithProviders(<TimerStressHarness onStateUpdate={(t) => (timerRef = t)} />);

      await waitFor(() => {
        expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-101');
      });

      // Start Task 1
      await act(async () => {
        await timerRef!.startTimer('task-101', 'Primary Task');
      });
      expect(screen.getByTestId('is-running')).toHaveTextContent('true');

      // Directly invoke startTimer for Task 2
      await act(async () => {
        await timerRef!.startTimer('task-102', 'Secondary Task');
      });

      // Active task must now be task-102
      expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-102');
      expect(screen.getByTestId('is-running')).toHaveTextContent('true');

      // Verify Task 2 in DB was auto-promoted from not_started to in_progress
      const snapshot = mockSupabase.testUtils.getSnapshot();
      const t2 = snapshot.tasks.find((t) => t.id === 'task-102');
      expect(t2?.status).toBe('in_progress');
    });

    it('manual time edit (updateManualTime) followed by stopTimer does not duplicate elapsed seconds', async () => {
      let timerRef: ReturnType<typeof useTimer> | null = null;
      renderWithProviders(<TimerStressHarness onStateUpdate={(t) => (timerRef = t)} />);

      await waitFor(() => {
        expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-101');
      });

      // User rectifies timer to 120 seconds
      await act(async () => {
        await timerRef!.startTimer();
        await timerRef!.updateManualTime(120);
      });

      // At this point, 120s was inserted with is_manual_edit = true
      let snapshot = mockSupabase.testUtils.getSnapshot();
      const logsAfterManual = snapshot.time_logs.filter((l) => l.task_id === 'task-101');
      expect(logsAfterManual.length).toBe(1);
      expect(logsAfterManual[0].duration_seconds).toBe(120);
      expect(logsAfterManual[0].is_manual_edit).toBe(true);

      // Now user stops timer (or switches active task)
      await act(async () => {
        await timerRef!.stopTimer();
      });

      // Check time_logs: stopTimer inserts a SECOND log of 120s with is_manual_edit = false!
      snapshot = mockSupabase.testUtils.getSnapshot();
      const logsAfterStop = snapshot.time_logs.filter((l) => l.task_id === 'task-101');
      
      const totalLogged = logsAfterStop.reduce((sum, l) => sum + l.duration_seconds, 0);
      expect(logsAfterStop.length).toBe(1);
      expect(totalLogged).toBe(120);
    });

    it('starting timer on Task 2 while Task 1 is paused commits Task 1 and starts Task 2 cleanly from 0', async () => {
      let timerRef: ReturnType<typeof useTimer> | null = null;
      renderWithProviders(<TimerStressHarness onStateUpdate={(t) => (timerRef = t)} />);

      await waitFor(() => {
        expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-101');
      });

      // Simulate Task 1 having paused elapsed seconds
      await act(async () => {
        await timerRef!.updateManualTime(75);
      });
      expect(screen.getByTestId('elapsed-seconds')).toHaveTextContent('75');
      expect(screen.getByTestId('is-running')).toHaveTextContent('false');

      // Now user starts timer on Task 2
      await act(async () => {
        await timerRef!.startTimer('task-102', 'Secondary Task');
      });

      const t2Elapsed = parseInt(screen.getByTestId('elapsed-seconds').textContent || '0', 10);
      expect(t2Elapsed).toBe(0);
      expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-102');
      expect(screen.getByTestId('is-running')).toHaveTextContent('true');
    });
  });

  // =========================================================================
  // VECTOR 3: Active Task Deletion Handling
  // =========================================================================
  describe('Vector 3: Active Task Deletion Handling', () => {
    it('handles background deletion of active task gracefully without crashing TimerProvider', async () => {
      let timerRef: ReturnType<typeof useTimer> | null = null;
      renderWithProviders(<TimerStressHarness onStateUpdate={(t) => (timerRef = t)} />);

      await waitFor(() => {
        expect(screen.getByTestId('active-task-id')).toHaveTextContent('task-101');
      });

      // Start timer on task-101
      await act(async () => {
        await timerRef!.startTimer();
      });
      expect(screen.getByTestId('is-running')).toHaveTextContent('true');

      // Simulate admin deleting task-101 in database
      const dbState = mockSupabase.testUtils.getSnapshot();
      mockSupabase.testUtils.seedDatabase({
        tasks: dbState.tasks.filter((t) => t.id !== 'task-101'),
      });

      // Stop timer on the now-deleted task: must not crash
      await act(async () => {
        await timerRef!.stopTimer();
      });

      expect(screen.getByTestId('is-running')).toHaveTextContent('false');
      expect(screen.getByTestId('elapsed-seconds')).toHaveTextContent('0');
    });

    it('mounting TimerProvider with user.activeTaskId pointing to a non-existent task defaults gracefully', async () => {
      // Seed user with activeTaskId that does not exist in tasks table
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
            active_task_id: 'non-existent-task-999',
            created_at: new Date().toISOString(),
          },
        ],
      });

      renderWithProviders(<TimerStressHarness />);

      // Should mount without crashing
      await waitFor(() => {
        expect(screen.getByTestId('stress-harness')).toBeInTheDocument();
      });

      // active-task-id should be none or non-existent without error
      const taskIdElem = screen.getByTestId('active-task-id');
      expect(taskIdElem.textContent).toBe('none');
    });
  });

  // =========================================================================
  // VECTOR 4: LocalStorage State Recovery & Resiliency
  // =========================================================================
  describe('Vector 4: LocalStorage State Recovery & Resiliency', () => {
    const storageKey = 'artlake_timer_proj-1_usr-1';

    it('restores timer state from localStorage on mount without premature eviction', async () => {
      // Seed valid timer state in localStorage
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          activeTaskId: 'task-101',
          activeTaskTitle: 'Primary Task',
          isRunning: true,
          startTime: Date.now() - 60000,
          accumulatedSeconds: 30,
        })
      );

      // Verify it was present before mounting
      expect(localStorage.getItem(storageKey)).not.toBeNull();

      renderWithProviders(<TimerStressHarness />);

      await waitFor(() => {
        expect(screen.getByTestId('stress-harness')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-running')).toHaveTextContent('true');
      });
      const elapsed = parseInt(screen.getByTestId('elapsed-seconds').textContent || '0', 10);
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    it('handles negative or invalid accumulatedSeconds in localStorage by clamping safely', async () => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          activeTaskId: 'task-101',
          activeTaskTitle: 'Primary Task',
          isRunning: false,
          startTime: null,
          accumulatedSeconds: -999,
        })
      );

      renderWithProviders(<TimerStressHarness />);

      await waitFor(() => {
        expect(screen.getByTestId('stress-harness')).toBeInTheDocument();
      });

      // formatted elapsed should be safely clamped to 00:00:00
      expect(screen.getByTestId('formatted-elapsed')).toHaveTextContent('00:00:00');
    });
  });
});
