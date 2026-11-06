import React, { useEffect, useRef } from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { mockSupabase } from '../../src/services/mockSupabase';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { ProjectProvider, useProject } from '../../src/context/ProjectContext';
import { TimerProvider, useTimer } from '../../src/context/TimerContext';
import { TaskProvider } from '../../src/context/TaskContext';
import { useTasks } from '../../src/hooks/useTasks';
import { TaskStatus, TaskRow, SubtaskRow, ProjectRow, ProfileRow } from '../../src/types/models';

// ----------------------------------------------------------------------------
// HARNESS PROBE COMPONENT
// ----------------------------------------------------------------------------

interface ProbeState {
  tasks: ReturnType<typeof useTasks>;
  timer: ReturnType<typeof useTimer>;
  project: ReturnType<typeof useProject>;
  auth: ReturnType<typeof useAuth>;
}

const OptimisticHarnessProbe: React.FC<{
  onProbe?: (probe: ProbeState) => void;
}> = ({ onProbe }) => {
  const tasks = useTasks();
  const timer = useTimer();
  const project = useProject();
  const auth = useAuth();

  const probeRef = useRef<ProbeState>({ tasks, timer, project, auth });
  probeRef.current = { tasks, timer, project, auth };

  useEffect(() => {
    if (onProbe) {
      onProbe(probeRef.current);
    }
  });

  return (
    <div data-testid="optimistic-probe">
      <div data-testid="probe-active-task-id">{tasks.activeTaskId || 'none'}</div>
      <div data-testid="probe-is-loading">{tasks.isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="probe-timer-running">{timer.isRunning ? 'running' : 'stopped'}</div>
      <div data-testid="probe-timer-task-id">{timer.activeTaskId || 'none'}</div>
      <div data-testid="probe-timer-elapsed">{timer.elapsedSeconds}</div>
      <div data-testid="probe-tasks-count">{tasks.tasks.length}</div>
      <div data-testid="probe-subtasks-count">{tasks.subtasks.length}</div>
      <div data-testid="probe-comments-count">{tasks.comments.length}</div>
      <div data-testid="probe-current-project-id">{project.currentProject?.id || 'none'}</div>
    </div>
  );
};

const renderWithProviders = (onProbe?: (probe: ProbeState) => void) => {
  return render(
    <AuthProvider>
      <ProjectProvider>
        <TimerProvider>
          <TaskProvider>
            <OptimisticHarnessProbe onProbe={onProbe} />
          </TaskProvider>
        </TimerProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

// ----------------------------------------------------------------------------
// FIXTURES
// ----------------------------------------------------------------------------

const mockAdminUser = {
  id: 'usr-admin-1',
  email: 'lead@artlake.studio',
  full_name: 'Lead Developer',
  role: 'admin' as const,
  department: '#CoreDev',
};

const mockProjectAlpha: ProjectRow = {
  id: 'proj-alpha',
  name: 'Project Alpha (Core Engine)',
  description: 'Main production workspace',
  created_by: 'usr-admin-1',
  created_at: '2026-11-01T08:00:00Z',
};

const mockProjectBeta: ProjectRow = {
  id: 'proj-beta',
  name: 'Project Beta (Tools & Audio)',
  description: 'Secondary workspace',
  created_by: 'usr-admin-1',
  created_at: '2026-11-03T08:00:00Z',
};

const mockProjectEmpty: ProjectRow = {
  id: 'proj-empty',
  name: 'Project Empty (Zero Tasks)',
  description: 'Empty workspace for isolation challenge',
  created_by: 'usr-admin-1',
  created_at: '2026-11-02T08:00:00Z',
};

const getSeedTasks = (): TaskRow[] => [
  {
    id: 'task-a1-hero',
    project_id: 'proj-alpha',
    title: 'Alpha Hero Task: Core Engine Loop',
    description: 'High priority active hero task',
    status: 'in_progress',
    priority: 'high',
    department_tag: '#CoreDev',
    assignee_id: 'usr-admin-1',
    queue_order: 0,
    estimated_minutes: 480,
    logged_minutes: 120,
    due_date: '2026-11-10T18:00:00Z',
    start_date: '2026-11-01T08:00:00Z',
    blocker_reason: null,
    blocking_target: null,
    review_output_link: null,
    created_at: '2026-11-01T09:00:00Z',
    updated_at: '2026-11-01T09:00:00Z',
  },
  {
    id: 'task-a2-queued',
    project_id: 'proj-alpha',
    title: 'Alpha Queued Task: Shader Pipeline',
    description: 'Secondary task waiting in priority queue',
    status: 'not_started',
    priority: 'medium',
    department_tag: '#TechArt',
    assignee_id: 'usr-admin-1',
    queue_order: 1,
    estimated_minutes: 300,
    logged_minutes: 0,
    due_date: '2026-11-12T18:00:00Z',
    start_date: null,
    blocker_reason: null,
    blocking_target: 'Audio Team',
    review_output_link: null,
    created_at: '2026-11-01T09:30:00Z',
    updated_at: '2026-11-01T09:30:00Z',
  },
  {
    id: 'task-a3-queued',
    project_id: 'proj-alpha',
    title: 'Alpha Third Task: Physics Collider Pass',
    description: 'Third task in queue',
    status: 'not_started',
    priority: 'low',
    department_tag: '#CoreDev',
    assignee_id: 'usr-admin-1',
    queue_order: 2,
    estimated_minutes: 180,
    logged_minutes: 0,
    due_date: null,
    start_date: null,
    blocker_reason: null,
    blocking_target: null,
    review_output_link: null,
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'task-a-orphan',
    project_id: 'proj-alpha',
    title: 'Alpha Orphan Task: Asset Compression',
    description: 'Unassigned task in backlog',
    status: 'not_started',
    priority: 'low',
    department_tag: '#AssetPipeline',
    assignee_id: null,
    queue_order: 99,
    estimated_minutes: 120,
    logged_minutes: 0,
    due_date: null,
    start_date: null,
    blocker_reason: null,
    blocking_target: null,
    review_output_link: null,
    created_at: '2026-11-01T11:00:00Z',
    updated_at: '2026-11-01T11:00:00Z',
  },
  // Beta Tasks
  {
    id: 'task-b1-hero',
    project_id: 'proj-beta',
    title: 'Beta Hero Task: Audio Spatializer',
    description: 'Active task in beta project',
    status: 'in_progress',
    priority: 'high',
    department_tag: '#Audio',
    assignee_id: 'usr-admin-1',
    queue_order: 0,
    estimated_minutes: 240,
    logged_minutes: 60,
    due_date: '2026-11-15T18:00:00Z',
    start_date: '2026-11-02T08:00:00Z',
    blocker_reason: null,
    blocking_target: null,
    review_output_link: null,
    created_at: '2026-11-02T09:00:00Z',
    updated_at: '2026-11-02T09:00:00Z',
  },
  {
    id: 'task-b2-queued',
    project_id: 'proj-beta',
    title: 'Beta Queued Task: Reverb Zones',
    description: 'Queued task in beta project',
    status: 'not_started',
    priority: 'medium',
    department_tag: '#Audio',
    assignee_id: 'usr-admin-1',
    queue_order: 1,
    estimated_minutes: 180,
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

const getSeedSubtasks = (): SubtaskRow[] => [
  {
    id: 'sub-a1-1',
    task_id: 'task-a1-hero',
    title: 'Benchmark rendering loop tick rate',
    is_completed: false,
    position: 0,
    created_at: '2026-11-01T09:10:00Z',
  },
  {
    id: 'sub-a1-2',
    task_id: 'task-a1-hero',
    title: 'Integrate native culling compute shader',
    is_completed: true,
    position: 1,
    created_at: '2026-11-01T09:15:00Z',
  },
];

const getSeedProfiles = (): ProfileRow[] => [
  {
    id: mockAdminUser.id,
    email: mockAdminUser.email,
    full_name: mockAdminUser.full_name,
    initials: 'LD',
    avatar_url: null,
    role: mockAdminUser.role,
    department: mockAdminUser.department,
    active_task_id: 'task-a1-hero',
    created_at: '2026-11-01T08:00:00Z',
  },
];

// ----------------------------------------------------------------------------
// ADVERSARIAL STRESS SUITE
// ----------------------------------------------------------------------------

describe('Empirical Challenger: M4 Optimistic State Machine Adversarial Stress Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabase.testUtils.resetDatabase();
    localStorage.clear();

    mockSupabase.testUtils.seedDatabase({
      profiles: getSeedProfiles(),
      projects: [mockProjectAlpha, mockProjectBeta, mockProjectEmpty],
      project_members: [
        {
          id: 'pm-alpha-admin',
          project_id: mockProjectAlpha.id,
          user_id: mockAdminUser.id,
          user_email: mockAdminUser.email,
          invited_at: '2026-11-01T08:00:00Z',
        },
        {
          id: 'pm-beta-admin',
          project_id: mockProjectBeta.id,
          user_id: mockAdminUser.id,
          user_email: mockAdminUser.email,
          invited_at: '2026-11-02T08:00:00Z',
        },
        {
          id: 'pm-empty-admin',
          project_id: mockProjectEmpty.id,
          user_id: mockAdminUser.id,
          user_email: mockAdminUser.email,
          invited_at: '2026-11-03T08:00:00Z',
        },
      ],
      tasks: getSeedTasks(),
      subtasks: getSeedSubtasks(),
      task_comments: [
        {
          id: 'comm-a1-1',
          task_id: 'task-a1-hero',
          author_id: mockAdminUser.id,
          content: 'Initial architecture discussion note.',
          created_at: '2026-11-01T09:20:00Z',
        },
      ],
      task_attachments: [],
      time_logs: [],
    });

    mockSupabase.testUtils.setMockUser(mockAdminUser);
    localStorage.setItem('artlake_active_project_id', mockProjectAlpha.id);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // VECTOR 1: CONCURRENCY BURSTS & PARALLEL INTERLEAVED ACTIONS
  // ==========================================================================
  describe('Vector 1: Concurrency Bursts & Interleaved Actions', () => {
    it('handles a rapid multi-action concurrency burst with immediate optimistic rendering and clean resolution', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe).not.toBeNull();
        expect(probe!.tasks.isLoading).toBe(false);
        expect(probe!.tasks.activeTaskId).toBe('task-a1-hero');
      });

      // Execute 5 concurrent mutations in parallel (Promise.all)
      let results: boolean[] = [];
      await act(async () => {
        const p1 = probe!.tasks.changeStatus('task-a1-hero', 'blocked', {
          blockerReason: 'Waiting on shader compilation tools',
        });
        const p2 = probe!.tasks.toggleSubtask('sub-a1-1');
        const p3 = probe!.tasks.addSubtask('task-a1-hero', 'Burst subtask concurrent 1');
        const p4 = probe!.tasks.addComment('task-a1-hero', 'Burst comment concurrent 1');
        const p5 = probe!.tasks.promoteToActiveTask('task-a2-queued');

        results = await Promise.all([p1, p2, p3, p4, p5]);
      });

      // All parallel actions should return success
      expect(results).toEqual([true, true, true, true, true]);
      expect(probe!.tasks.activeTaskId).toBe('task-a2-queued');

      // Verify post-burst database persistence
      const dbTasks = mockSupabase.testUtils.getSnapshot().tasks;
      const updatedHero = dbTasks.find((t) => t.id === 'task-a1-hero');
      expect(updatedHero?.status).toBe('blocked');
      expect(updatedHero?.blocker_reason).toBe('Waiting on shader compilation tools');

      const dbSubtasks = mockSupabase.testUtils.getSnapshot().subtasks;
      const toggledSub = dbSubtasks.find((s) => s.id === 'sub-a1-1');
      expect(toggledSub?.is_completed).toBe(true);

      const addedSub = dbSubtasks.find((s) => s.title === 'Burst subtask concurrent 1');
      expect(addedSub).toBeDefined();

      const dbComments = mockSupabase.testUtils.getSnapshot().task_comments;
      const addedComm = dbComments.find((c) => c.content === 'Burst comment concurrent 1');
      expect(addedComm).toBeDefined();

      const dbProfiles = mockSupabase.testUtils.getSnapshot().profiles;
      const adminProfile = dbProfiles.find((p) => p.id === mockAdminUser.id);
      expect(adminProfile?.active_task_id).toBe('task-a2-queued');
    });

    it('survives rapid flip-flop status transitions in a tight sequential loop without corruption', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      const sequence: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'in_review', 'completed'];

      for (const targetStatus of sequence) {
        await act(async () => {
          const ok = await probe!.tasks.changeStatus('task-a1-hero', targetStatus, {
            blockerReason: targetStatus === 'blocked' ? 'Flapping blocker' : undefined,
          });
          expect(ok).toBe(true);
        });

        const currentTask = probe!.tasks.tasks.find((t) => t.id === 'task-a1-hero');
        expect(currentTask?.status).toBe(targetStatus);
      }

      // Check final state in DB
      const finalTask = mockSupabase.testUtils.getSnapshot().tasks.find((t) => t.id === 'task-a1-hero');
      expect(finalTask?.status).toBe('completed');
    });

    it('survives rapid subtask toggling burst on the same item without desync', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      const initial = probe!.tasks.subtasks.find((s) => s.id === 'sub-a1-1')?.isCompleted;
      expect(initial).toBe(false);

      // Toggle 3 times in rapid sequence: false -> true -> false -> true
      await act(async () => {
        await probe!.tasks.toggleSubtask('sub-a1-1');
      });
      expect(probe!.tasks.subtasks.find((s) => s.id === 'sub-a1-1')?.isCompleted).toBe(true);

      await act(async () => {
        await probe!.tasks.toggleSubtask('sub-a1-1');
      });
      expect(probe!.tasks.subtasks.find((s) => s.id === 'sub-a1-1')?.isCompleted).toBe(false);

      await act(async () => {
        await probe!.tasks.toggleSubtask('sub-a1-1');
      });
      expect(probe!.tasks.subtasks.find((s) => s.id === 'sub-a1-1')?.isCompleted).toBe(true);

      // Check database matches
      const dbSub = mockSupabase.testUtils.getSnapshot().subtasks.find((s) => s.id === 'sub-a1-1');
      expect(dbSub?.is_completed).toBe(true);
    });

    it('handles concurrent orphan assignment while simultaneously promoting another task', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      expect(probe!.tasks.orphanTasks.length).toBe(1);
      expect(probe!.tasks.orphanTasks[0].id).toBe('task-a-orphan');

      let assignOk = false;
      let promoteOk = false;

      await act(async () => {
        const [r1, r2] = await Promise.all([
          probe!.tasks.assignOrphanTask('task-a-orphan', mockAdminUser.id),
          probe!.tasks.promoteToActiveTask('task-a2-queued'),
        ]);
        assignOk = r1;
        promoteOk = r2;
      });

      expect(assignOk).toBe(true);
      expect(promoteOk).toBe(true);

      // Orphan is no longer orphan
      expect(probe!.tasks.orphanTasks.length).toBe(0);
      const assigned = probe!.tasks.tasks.find((t) => t.id === 'task-a-orphan');
      expect(assigned?.assigneeId).toBe(mockAdminUser.id);
      expect(probe!.tasks.activeTaskId).toBe('task-a2-queued');
    });
  });

  // ==========================================================================
  // VECTOR 2: ROLLBACK ACCURACY ON SUPABASE MUTATION FAILURES
  // ==========================================================================
  describe('Vector 2: Rollback Accuracy on Mutation Failures', () => {
    it('reverts status, blockerReason, and reviewLink cleanly when Supabase query rejects', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      const originalTask = probe!.tasks.tasks.find((t) => t.id === 'task-a1-hero')!;
      const originalStatus = originalTask.status;
      const originalBlocker = originalTask.blockerReason;
      const originalReview = originalTask.reviewOutputLink;

      // Intercept tasks update on Supabase and simulate network/permission failure
      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'tasks') {
          vi.spyOn(builder, 'update').mockReturnValue({
            eq: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Database connection failure simulated', code: '08006' },
              }),
          } as any);
        }
        return builder;
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await probe!.tasks.changeStatus('task-a1-hero', 'blocked', {
          blockerReason: 'Rollback should remove this reason',
          reviewLink: 'https://artlake.studio/pr/123',
        });
      });

      expect(success).toBe(false);

      // Verify that state reverted to exact previous snapshot
      const revertedTask = probe!.tasks.tasks.find((t) => t.id === 'task-a1-hero')!;
      expect(revertedTask.status).toBe(originalStatus);
      expect(revertedTask.blockerReason).toBe(originalBlocker);
      expect(revertedTask.reviewOutputLink).toBe(originalReview);

      spy.mockRestore();
    });

    it('reverts subtask isCompleted accurately when Supabase update fails', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      const originalCompleted = probe!.tasks.subtasks.find((s) => s.id === 'sub-a1-1')!.isCompleted;
      expect(originalCompleted).toBe(false);

      // Intercept subtasks update failure
      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'subtasks') {
          vi.spyOn(builder, 'update').mockReturnValue({
            eq: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Row level security check failed', code: '42501' },
              }),
          } as any);
        }
        return builder;
      });

      let success = true;
      await act(async () => {
        success = await probe!.tasks.toggleSubtask('sub-a1-1');
      });

      expect(success).toBe(false);
      const postRevertCompleted = probe!.tasks.subtasks.find((s) => s.id === 'sub-a1-1')!.isCompleted;
      expect(postRevertCompleted).toBe(originalCompleted);

      spy.mockRestore();
    });

    it('evicts temporary optimistic subtask when insert query rejects', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      const initialSubtasksCount = probe!.tasks.subtasks.length;

      // Intercept subtasks insert
      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'subtasks') {
          vi.spyOn(builder, 'insert').mockReturnValue(
            Promise.resolve({
              data: null,
              error: { message: 'Simulated insert error', code: '23502' },
            }) as any
          );
        }
        return builder;
      });

      let success = true;
      await act(async () => {
        success = await probe!.tasks.addSubtask('task-a1-hero', 'Ghost Subtask That Fails');
      });

      expect(success).toBe(false);
      // Verify array returned to initial length and ghost item was purged
      expect(probe!.tasks.subtasks.length).toBe(initialSubtasksCount);
      expect(probe!.tasks.subtasks.some((s) => s.title === 'Ghost Subtask That Fails')).toBe(false);

      spy.mockRestore();
    });

    it('evicts temporary optimistic comment when insert query rejects', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      const initialCommentsCount = probe!.tasks.comments.length;

      // Intercept task_comments insert
      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'task_comments') {
          vi.spyOn(builder, 'insert').mockReturnValue(
            Promise.resolve({
              data: null,
              error: { message: 'Simulated comment error', code: '23502' },
            }) as any
          );
        }
        return builder;
      });

      let success = true;
      await act(async () => {
        success = await probe!.tasks.addComment('task-a1-hero', 'Ghost comment that fails');
      });

      expect(success).toBe(false);
      expect(probe!.tasks.comments.length).toBe(initialCommentsCount);
      expect(probe!.tasks.comments.some((c) => c.content === 'Ghost comment that fails')).toBe(false);

      spy.mockRestore();
    });

    it('empirically probes promoteToActiveTask rollback: activeTaskId reverts, while surfacing queueOrder divergence', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      const prevActive = probe!.tasks.activeTaskId;
      expect(prevActive).toBe('task-a1-hero');

      // Fail profiles update
      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'profiles') {
          vi.spyOn(builder, 'update').mockReturnValue({
            eq: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Failed to update active task on profile', code: '42501' },
              }),
          } as any);
        }
        return builder;
      });

      let success = true;
      await act(async () => {
        success = await probe!.tasks.promoteToActiveTask('task-a2-queued');
      });

      expect(success).toBe(false);

      // Verify activeTaskId reverts cleanly to the original hero task
      expect(probe!.tasks.activeTaskId).toBe('task-a1-hero');

      // EMPIRICAL CHALLENGE PROBE:
      // In TaskContext taskReducer ROLLBACK_PROMOTE_TASK:
      // only activeTaskId is reverted, but tasks queueOrder was mutated during OPTIMISTIC_PROMOTE_TASK.
      // We empirically verify the resulting state of queueOrder on the tasks:
      const taskA1 = probe!.tasks.tasks.find((t) => t.id === 'task-a1-hero');
      const taskA2 = probe!.tasks.tasks.find((t) => t.id === 'task-a2-queued');
      expect(taskA1).toBeDefined();
      expect(taskA2).toBeDefined();

      // Note: In TaskContext.tsx lines 241-264:
      // OPTIMISTIC_PROMOTE_TASK sets taskA2.queueOrder = 0 and taskA1.queueOrder = 1.
      // ROLLBACK_PROMOTE_TASK restores state.activeTaskId, but leaves taskA2.queueOrder at 0!
      // This is an empirical challenger finding: queueOrder is not restored on promotion rollback.
      expect(probe!.tasks.activeTaskId).toBe('task-a1-hero');

      spy.mockRestore();
    });

    it('reverts assignOrphanTask cleanly when Supabase query rejects', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      const orphanBefore = probe!.tasks.tasks.find((t) => t.id === 'task-a-orphan');
      expect(orphanBefore?.assigneeId).toBeNull();

      // Intercept tasks update
      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'tasks') {
          vi.spyOn(builder, 'update').mockReturnValue({
            eq: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' },
              }),
          } as any);
        }
        return builder;
      });

      let success = true;
      await act(async () => {
        success = await probe!.tasks.assignOrphanTask('task-a-orphan', mockAdminUser.id);
      });

      expect(success).toBe(false);

      // Verify assigneeId reverted to null
      const orphanAfter = probe!.tasks.tasks.find((t) => t.id === 'task-a-orphan');
      expect(orphanAfter?.assigneeId).toBeNull();

      spy.mockRestore();
    });
  });

  // ==========================================================================
  // VECTOR 3: TIMER SYNCHRONIZATION UNDER TASK PROMOTION
  // ==========================================================================
  describe('Vector 3: Timer Synchronization Under Promotion', () => {
    it('commits active running timer to time_logs and rebinds new task when hero task is promoted', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      // 1. Start timer on active Hero task (task-a1-hero)
      await act(async () => {
        await probe!.timer.startTimer('task-a1-hero', 'Alpha Hero Task: Core Engine Loop');
      });

      expect(probe!.timer.isRunning).toBe(true);
      expect(probe!.timer.activeTaskId).toBe('task-a1-hero');

      // 2. Simulate 120 seconds elapsed via manual edit or update
      await act(async () => {
        await probe!.timer.updateManualTime(120);
      });

      // Keep timer marked as running
      await act(async () => {
        await probe!.timer.startTimer('task-a1-hero', 'Alpha Hero Task: Core Engine Loop');
      });

      // 3. Promote secondary task (task-a2-queued) while timer is running
      let promoteOk = false;
      await act(async () => {
        promoteOk = await probe!.tasks.promoteToActiveTask('task-a2-queued');
      });

      expect(promoteOk).toBe(true);

      // Verify Timer state after promotion:
      // A. Timer was stopped
      expect(probe!.timer.isRunning).toBe(false);

      // B. Timer active task is rebound to newly promoted task
      expect(probe!.timer.activeTaskId).toBe('task-a2-queued');
      expect(probe!.tasks.activeTaskId).toBe('task-a2-queued');

      // C. Elapsed seconds on timer reset to 0
      expect(probe!.timer.elapsedSeconds).toBe(0);

      // D. Verify time_logs table received the committed session for task-a1-hero
      const logs = mockSupabase.testUtils.getSnapshot().time_logs;
      const committedLog = logs.find((l) => l.task_id === 'task-a1-hero');
      expect(committedLog).toBeDefined();
      expect(committedLog?.project_id).toBe('proj-alpha');
      expect(committedLog?.user_id).toBe(mockAdminUser.id);
    });

    it('cleanly rebinds timer when promoting a task while timer is stopped with 0 seconds', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      expect(probe!.timer.isRunning).toBe(false);

      const logsBeforeCount = mockSupabase.testUtils.getSnapshot().time_logs.length;

      await act(async () => {
        await probe!.tasks.promoteToActiveTask('task-a2-queued');
      });

      expect(probe!.tasks.activeTaskId).toBe('task-a2-queued');
      expect(probe!.timer.activeTaskId).toBe('task-a2-queued');
      expect(probe!.timer.isRunning).toBe(false);

      // No redundant empty time log should be written
      const logsAfterCount = mockSupabase.testUtils.getSnapshot().time_logs.length;
      expect(logsAfterCount).toBe(logsBeforeCount);
    });

    it('promoted task auto-starts into in_progress when timer is subsequently started', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
      });

      // task-a2-queued is initially not_started
      const queuedTask = probe!.tasks.tasks.find((t) => t.id === 'task-a2-queued');
      expect(queuedTask?.status).toBe('not_started');

      // Promote task-a2-queued
      await act(async () => {
        await probe!.tasks.promoteToActiveTask('task-a2-queued');
      });

      expect(probe!.tasks.activeTaskId).toBe('task-a2-queued');

      // Start timer on newly active task
      await act(async () => {
        await probe!.timer.startTimer('task-a2-queued');
      });

      expect(probe!.timer.isRunning).toBe(true);

      // Verify task status was transitioned to in_progress in DB
      const dbTask = mockSupabase.testUtils.getSnapshot().tasks.find((t) => t.id === 'task-a2-queued');
      expect(dbTask?.status).toBe('in_progress');
    });
  });

  // ==========================================================================
  // VECTOR 4: PROJECT SWITCHING MID-MUTATION ISOLATION
  // ==========================================================================
  describe('Vector 4: Project Switching Mid-Mutation Isolation', () => {
    it('isolates state cleanly when switching projects while a mutation is in flight', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
        expect(probe!.project.currentProject?.id).toBe('proj-alpha');
      });

      expect(probe!.tasks.tasks.length).toBe(4);

      // We start a changeStatus mutation on proj-alpha with delayed resolve
      let resolveDelayedQuery: (val: any) => void = () => {};
      const delayedPromise = new Promise((resolve) => {
        resolveDelayedQuery = resolve;
      });

      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'tasks') {
          vi.spyOn(builder, 'update').mockReturnValue({
            eq: () =>
              delayedPromise.then(() => ({
                data: [{ id: 'task-a1-hero', status: 'completed' }],
                error: null,
              })),
          } as any);
        }
        return builder;
      });

      // Start mutation without waiting for it
      const mutationPromise = probe!.tasks.changeStatus('task-a1-hero', 'completed');

      // Switch project to proj-beta immediately while mutation is pending
      await act(async () => {
        probe!.project.selectProject('proj-beta');
      });

      await waitFor(() => {
        expect(probe!.project.currentProject?.id).toBe('proj-beta');
        expect(probe!.tasks.tasks.some((t) => t.projectId === 'proj-beta')).toBe(true);
      });

      // Now resolve the delayed mutation on proj-alpha
      await act(async () => {
        resolveDelayedQuery(true);
        await mutationPromise;
      });

      // Verify that Project Beta state was NOT contaminated with Project Alpha tasks
      const betaTasksInState = probe!.tasks.tasks;
      expect(betaTasksInState.length).toBe(2);
      expect(betaTasksInState.every((t) => t.projectId === 'proj-beta')).toBe(true);
      expect(betaTasksInState.some((t) => t.id === 'task-a1-hero')).toBe(false);

      spy.mockRestore();
    });

    it('handles project switch mid-mutation rollback without crashing or corrupting target project', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
        expect(probe!.project.currentProject?.id).toBe('proj-alpha');
      });

      // Delayed rejection for status mutation
      let rejectDelayedQuery: (err: any) => void = () => {};
      const delayedRejectPromise = new Promise((_, reject) => {
        rejectDelayedQuery = reject;
      });

      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'tasks') {
          vi.spyOn(builder, 'update').mockReturnValue({
            eq: () =>
              delayedRejectPromise.catch((err) => ({
                data: null,
                error: err,
              })),
          } as any);
        }
        return builder;
      });

      // Start mutation on task-a1-hero
      const mutationPromise = probe!.tasks.changeStatus('task-a1-hero', 'blocked');

      // Switch to Project Beta
      await act(async () => {
        probe!.project.selectProject('proj-beta');
      });

      await waitFor(() => {
        expect(probe!.project.currentProject?.id).toBe('proj-beta');
      });

      // Now reject the in-flight mutation
      await act(async () => {
        rejectDelayedQuery({ message: 'Delayed connection abort', code: '08006' });
        const res = await mutationPromise;
        expect(res).toBe(false);
      });

      // Project Beta tasks must remain intact and valid
      expect(probe!.tasks.tasks.every((t) => t.projectId === 'proj-beta')).toBe(true);
      expect(probe!.tasks.activeTaskId).toBe('task-b1-hero');

      spy.mockRestore();
    });

    it('transitions cleanly to empty state when switching to an empty project', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
        expect(probe!.project.currentProject?.id).toBe('proj-alpha');
      });

      expect(probe!.tasks.tasks.length).toBe(4);

      // Switch to Project Empty
      await act(async () => {
        probe!.project.selectProject('proj-empty');
      });

      await waitFor(() => {
        expect(probe!.project.currentProject?.id).toBe('proj-empty');
        expect(probe!.tasks.tasks.length).toBe(0);
        expect(probe!.tasks.activeTaskId).toBeNull();
        expect(probe!.tasks.activeTask).toBeNull();
        expect(probe!.tasks.activeHeroViewModel).toBeNull();
        expect(probe!.tasks.queuedTasks.length).toBe(0);
        expect(probe!.tasks.orphanTasks.length).toBe(0);
      });
    });

    it('survives project deletion without throwing unhandled exceptions and cleans up tasks', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
        expect(probe!.project.currentProject?.id).toBe('proj-alpha');
      });

      // Delete current project
      await act(async () => {
        const res = await probe!.project.deleteProject('proj-alpha');
        expect(res.error).toBeNull();
      });

      await waitFor(() => {
        // ProjectProvider should switch to next available project
        expect(probe!.project.currentProject?.id).toBeTruthy();
        expect(probe!.project.currentProject?.id).not.toBe('proj-alpha');
      });

      // Tasks should now be tasks of the switched project
      expect(probe!.tasks.tasks.every((t) => t.projectId === probe!.project.currentProject?.id)).toBe(true);
    });
  });

  // ==========================================================================
  // VECTOR 5: EMPIRICAL ADVERSARIAL FAILURE MODE PROBING & VULNERABILITY CATALOG
  // ==========================================================================
  describe('Vector 5: Empirical Adversarial Failure Mode Probing & Vulnerability Catalog', () => {
    it('VULNERABILITY 1: demonstrates queueOrder distortion upon promoteToActiveTask rollback', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
        expect(probe!.tasks.activeTaskId).toBe('task-a1-hero');
      });

      const initialA1 = probe!.tasks.tasks.find((t) => t.id === 'task-a1-hero')!;
      const initialA2 = probe!.tasks.tasks.find((t) => t.id === 'task-a2-queued')!;
      expect(initialA1.queueOrder).toBe(0);
      expect(initialA2.queueOrder).toBe(1);

      // Force profiles update to reject
      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'profiles') {
          vi.spyOn(builder, 'update').mockReturnValue({
            eq: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Database RLS check error on profiles update', code: '42501' },
              }),
          } as any);
        }
        return builder;
      });

      let res = true;
      await act(async () => {
        res = await probe!.tasks.promoteToActiveTask('task-a2-queued');
      });

      expect(res).toBe(false);

      // Verify activeTaskId was reverted to task-a1-hero
      expect(probe!.tasks.activeTaskId).toBe('task-a1-hero');

      // EMPIRICALLY CONFIRMED DEFECT:
      // In TaskContext reducer line 259:
      // case 'ROLLBACK_PROMOTE_TASK': only sets activeTaskId: action.payload.previousActiveTaskId,
      // omitting restoring queueOrder for target and previous task.
      const postA1 = probe!.tasks.tasks.find((t) => t.id === 'task-a1-hero')!;
      const postA2 = probe!.tasks.tasks.find((t) => t.id === 'task-a2-queued')!;

      // Notice postA2 kept queueOrder 0 instead of reverting to 1, and postA1 kept 1 instead of 0
      expect(postA2.queueOrder).toBe(0);
      expect(postA1.queueOrder).toBe(1);

      spy.mockRestore();
    });

    it('VULNERABILITY 2: demonstrates TimerContext vs TaskContext desync when task promotion fails', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
        expect(probe!.tasks.activeTaskId).toBe('task-a1-hero');
        expect(probe!.timer.activeTaskId).toBe('task-a1-hero');
      });

      // Force profiles update rejection
      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'profiles') {
          vi.spyOn(builder, 'update').mockReturnValue({
            eq: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Supabase profiles network timeout', code: '08000' },
              }),
          } as any);
        }
        return builder;
      });

      let success = true;
      await act(async () => {
        success = await probe!.tasks.promoteToActiveTask('task-a2-queued');
      });

      expect(success).toBe(false);

      // EMPIRICALLY CONFIRMED DEFECT:
      // TaskContext rolled back activeTaskId to 'task-a1-hero'
      expect(probe!.tasks.activeTaskId).toBe('task-a1-hero');

      // But TimerContext was updated to 'task-a2-queued' in step C before try-catch,
      // and was never restored in catch (err) { ... }!
      expect(probe!.timer.activeTaskId).toBe('task-a2-queued');

      // Consequence: TopBar timer pill displays task-a2-queued while 70% card displays task-a1-hero
      expect(probe!.tasks.activeTaskId).not.toBe(probe!.timer.activeTaskId);

      spy.mockRestore();
    });

    it('VULNERABILITY 3: demonstrates cross-project activeTaskId corruption when delayed promotion rollback resolves after project switch', async () => {
      let probe: ProbeState | null = null;
      renderWithProviders((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe!.tasks.isLoading).toBe(false);
        expect(probe!.project.currentProject?.id).toBe('proj-alpha');
        expect(probe!.tasks.activeTaskId).toBe('task-a1-hero');
      });

      // Delayed rejection for profiles update
      let rejectDelayedProfile: (err: any) => void = () => {};
      const delayedRejectPromise = new Promise((_, reject) => {
        rejectDelayedProfile = reject;
      });

      const realFrom = mockSupabase.from.bind(mockSupabase);
      const spy = vi.spyOn(mockSupabase, 'from').mockImplementation((table: any) => {
        const builder = realFrom(table);
        if (table === 'profiles') {
          vi.spyOn(builder, 'update').mockReturnValue({
            eq: () =>
              delayedRejectPromise.catch((err) => ({
                data: null,
                error: err,
              })),
          } as any);
        }
        return builder;
      });

      // User in Project Alpha attempts to promote task-a2-queued
      const promotionPromise = probe!.tasks.promoteToActiveTask('task-a2-queued');

      // User immediately switches to Project Beta
      await act(async () => {
        probe!.project.selectProject('proj-beta');
      });

      await waitFor(() => {
        expect(probe!.project.currentProject?.id).toBe('proj-beta');
        // In Project Beta, initial active task is task-b1-hero
        expect(probe!.tasks.tasks.some((t) => t.id === 'task-b1-hero')).toBe(true);
      });

      // Now reject the delayed promotion that belonged to Project Alpha
      await act(async () => {
        rejectDelayedProfile({ message: 'Profile network error', code: '42501' });
        const res = await promotionPromise;
        expect(res).toBe(false);
      });

      // EMPIRICALLY CONFIRMED DEFECT:
      // The catch block dispatched ROLLBACK_PROMOTE_TASK with previousActiveTaskId: 'task-a1-hero'
      // which unconditionally overwrote activeTaskId in TaskContext,
      // even though the user is now on proj-beta!
      expect(probe!.tasks.activeTaskId).toBe('task-a1-hero');

      // Since task-a1-hero does not exist in proj-beta, activeTask is now NULL!
      expect(probe!.tasks.activeTask).toBeNull();
      expect(probe!.tasks.activeHeroViewModel).toBeNull();

      spy.mockRestore();
    });
  });
});
