import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { App } from '../../src/App';
import { mockSupabase } from '../../src/services/mockSupabase';
import { supabase } from '../../src/services/supabaseClient';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { ProjectProvider, useProject } from '../../src/context/ProjectContext';
import { TimerProvider, useTimer } from '../../src/context/TimerContext';
import { TaskProvider } from '../../src/context/TaskContext';
import { useTasks } from '../../src/hooks/useTasks';
import { ProjectRow, TaskRow, ProfileRow, ProjectMemberRow } from '../../src/types/models';

// ----------------------------------------------------------------------------
// HARNESS PROBE COMPONENT FOR DEEP CONTEXT VERIFICATION
// ----------------------------------------------------------------------------
interface ProbeState {
  auth: ReturnType<typeof useAuth>;
  project: ReturnType<typeof useProject>;
  timer: ReturnType<typeof useTimer>;
  tasks: ReturnType<typeof useTasks>;
}

const HarnessProbe: React.FC<{ onProbe: (probe: ProbeState) => void }> = ({ onProbe }) => {
  const auth = useAuth();
  const project = useProject();
  const timer = useTimer();
  const tasks = useTasks();

  React.useEffect(() => {
    onProbe({ auth, project, timer, tasks });
  });

  return (
    <div data-testid="harness-probe">
      <div data-testid="probe-user-id">{auth.user?.id || 'none'}</div>
      <div data-testid="probe-user-role">{auth.user?.role || 'none'}</div>
      <div data-testid="probe-is-admin">{project.isAdmin ? 'true' : 'false'}</div>
      <div data-testid="probe-current-project">{project.currentProject?.id || 'none'}</div>
      <div data-testid="probe-timer-running">{timer.isRunning ? 'true' : 'false'}</div>
      <div data-testid="probe-timer-elapsed">{timer.elapsedSeconds}</div>
      <div data-testid="probe-active-task">{timer.activeTaskId || 'none'}</div>
    </div>
  );
};

const renderHarness = (onProbe: (probe: ProbeState) => void) => {
  return render(
    <AuthProvider>
      <ProjectProvider>
        <TimerProvider>
          <TaskProvider>
            <HarnessProbe onProbe={onProbe} />
          </TaskProvider>
        </TimerProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

// ----------------------------------------------------------------------------
// FIXTURES
// ----------------------------------------------------------------------------
const testArtistUser: ProfileRow = {
  id: 'usr-artist-alpha',
  email: 'artist@artlake.studio',
  full_name: 'Studio Artist Alpha',
  initials: 'AA',
  avatar_url: null,
  role: 'user',
  department: '#Art',
  active_task_id: 'task-alpha-hero',
  created_at: '2026-11-01T08:00:00Z',
};

const testProducerAdmin: ProfileRow = {
  id: 'usr-lead-producer',
  email: 'producer@artlake.studio',
  full_name: 'Lead Producer Admin',
  initials: 'LP',
  avatar_url: null,
  role: 'admin',
  department: '#Production',
  active_task_id: null,
  created_at: '2026-11-01T08:00:00Z',
};

const testProjectAlpha: ProjectRow = {
  id: 'proj-alpha-main',
  name: 'ArtLake Studio Alpha',
  description: 'Primary accessible project',
  created_by: testProducerAdmin.id,
  created_at: '2026-11-01T08:00:00Z',
};

const testProjectBeta: ProjectRow = {
  id: 'proj-beta-confidential',
  name: 'ArtLake Confidential Beta',
  description: 'Restricted unannounced project',
  created_by: testProducerAdmin.id,
  created_at: '2026-11-01T09:00:00Z',
};

const testAlphaMembers: ProjectMemberRow[] = [
  {
    id: 'pm-alpha-admin',
    project_id: testProjectAlpha.id,
    user_email: testProducerAdmin.email,
    user_id: testProducerAdmin.id,
    invited_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'pm-alpha-artist',
    project_id: testProjectAlpha.id,
    user_email: testArtistUser.email,
    user_id: testArtistUser.id,
    invited_at: '2026-11-01T08:05:00Z',
  },
];

const testBetaMembers: ProjectMemberRow[] = [
  {
    id: 'pm-beta-admin',
    project_id: testProjectBeta.id,
    user_email: testProducerAdmin.email,
    user_id: testProducerAdmin.id,
    invited_at: '2026-11-01T09:00:00Z',
  },
  // Note: testArtistUser is NOT a member of Project Beta
];

const testAlphaTask: TaskRow = {
  id: 'task-alpha-hero',
  project_id: testProjectAlpha.id,
  title: 'Alpha Hero Concept Art',
  description: 'Primary task for Artist in Project Alpha',
  status: 'not_started',
  priority: 'high',
  department_tag: '#Art',
  assignee_id: testArtistUser.id,
  queue_order: 0,
  estimated_minutes: 480,
  logged_minutes: 0,
  due_date: '2026-11-20T18:00:00Z',
  start_date: null,
  blocker_reason: null,
  blocking_target: null,
  review_output_link: null,
  created_at: '2026-11-02T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
};

const testBetaTask: TaskRow = {
  id: 'task-beta-secret',
  project_id: testProjectBeta.id,
  title: 'Top Secret Gameplay Prototype',
  description: 'Strictly confidential task in Project Beta',
  status: 'in_progress',
  priority: 'high',
  department_tag: '#CoreGameplay',
  assignee_id: testProducerAdmin.id,
  queue_order: 0,
  estimated_minutes: 600,
  logged_minutes: 120,
  due_date: '2026-11-30T18:00:00Z',
  start_date: null,
  blocker_reason: null,
  blocking_target: null,
  review_output_link: null,
  created_at: '2026-11-02T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
};

// ============================================================================
// MAIN TEST SUITE: TIER 5 ADVERSARIAL SECURITY & STATE HARDENING
// ============================================================================
describe('Tier 5 Adversarial Security & State Hardening Suite', () => {
  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    localStorage.clear();
    vi.clearAllMocks();

    // Standard baseline seed
    mockSupabase.testUtils.seedDatabase({
      profiles: [testArtistUser, testProducerAdmin],
      projects: [testProjectAlpha, testProjectBeta],
      project_members: [...testAlphaMembers, ...testBetaMembers],
      tasks: [testAlphaTask, testBetaTask],
      subtasks: [
        {
          id: 'sub-alpha-1',
          task_id: testAlphaTask.id,
          title: 'Color Palette Pass',
          is_completed: false,
          position: 0,
          created_at: '2026-11-02T10:15:00Z',
        },
        {
          id: 'sub-beta-1',
          task_id: testBetaTask.id,
          title: 'Classified Subtask',
          is_completed: false,
          position: 0,
          created_at: '2026-11-02T10:15:00Z',
        },
      ],
      time_logs: [
        {
          id: 'tl-beta-1',
          project_id: testProjectBeta.id,
          user_id: testProducerAdmin.id,
          task_id: testBetaTask.id,
          started_at: '2026-11-02T08:00:00Z',
          ended_at: '2026-11-02T10:00:00Z',
          duration_seconds: 7200,
          is_manual_edit: false,
          year_week: '2026-W45',
          created_at: '2026-11-02T10:00:00Z',
        },
      ],
      task_comments: [
        {
          id: 'tc-beta-1',
          task_id: testBetaTask.id,
          author_id: testProducerAdmin.id,
          content: 'Confidential lead note',
          created_at: '2026-11-02T11:00:00Z',
        },
      ],
    });

    // Default mock user: artist (regular user)
    mockSupabase.testUtils.setMockUser({
      id: testArtistUser.id,
      email: testArtistUser.email,
      full_name: testArtistUser.full_name,
      role: 'user',
      department: testArtistUser.department,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // VECTOR 1: MALFORMED LOCALSTORAGE TAMPERING ON BOOT
  // ==========================================================================
  describe('Vector 1: Malformed LocalStorage Tampering on Boot', () => {
    it('1.1 recovers gracefully when artlake_active_project_id contains corrupted raw JSON syntax', async () => {
      // Adversarial payload: corrupted, non-JSON string
      localStorage.setItem('artlake_active_project_id', '{"broken_json: true, invalid_tokens >>> 123');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('active-project-name')).toHaveTextContent(testProjectAlpha.name);
      });

      // Must overwrite corrupted value in localStorage with valid project id
      expect(localStorage.getItem('artlake_active_project_id')).toBe(testProjectAlpha.id);
    });

    it('1.2 recovers gracefully when artlake_active_project_id points to a non-existent or deleted project ID', async () => {
      // Adversarial payload: dangling ghost project ID
      localStorage.setItem('artlake_active_project_id', 'dangling-ghost-project-999');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('active-project-name')).toHaveTextContent(testProjectAlpha.name);
      });

      expect(localStorage.getItem('artlake_active_project_id')).toBe(testProjectAlpha.id);
    });

    it('1.3 recovers gracefully when artlake_active_project_id contains empty string or whitespace', async () => {
      localStorage.setItem('artlake_active_project_id', '   ');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('active-project-name')).toHaveTextContent(testProjectAlpha.name);
      });

      expect(localStorage.getItem('artlake_active_project_id')).toBe(testProjectAlpha.id);
    });

    it('1.4 evicts corrupted timer JSON from localStorage and boots timer with clean 0 state', async () => {
      const timerKey = `artlake_timer_${testProjectAlpha.id}_${testArtistUser.id}`;
      // Adversarial payload: broken JSON in timer storage
      localStorage.setItem(timerKey, '{corrupted_timer_data: "fail');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('active-project-name')).toHaveTextContent(testProjectAlpha.name);
      });

      // Top bar timer pill must display 00:00:00 cleanly
      const timerPill = screen.getByTestId('topbar-zone-2');
      expect(timerPill).toBeInTheDocument();
      expect(timerPill.textContent).toContain('00:00:00');

      // Corrupted key must be evicted
      await waitFor(() => {
        expect(localStorage.getItem(timerKey)).toBeNull();
      });
    });

    it('1.5 clamps negative or malformed accumulatedSeconds in timer storage to safe >= 0', async () => {
      const timerKey = `artlake_timer_${testProjectAlpha.id}_${testArtistUser.id}`;
      // Adversarial payload: negative accumulated seconds
      localStorage.setItem(
        timerKey,
        JSON.stringify({
          activeTaskId: testAlphaTask.id,
          activeTaskTitle: testAlphaTask.title,
          isRunning: false,
          startTime: null,
          accumulatedSeconds: -9999,
        })
      );

      let probe: ProbeState = {} as ProbeState;
      renderHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.timer?.activeTaskId).toBe(testAlphaTask.id);
      });

      // Must clamp negative seconds to 0, never display negative elapsed time
      expect(probe.timer.elapsedSeconds).toBe(0);
      expect(probe.timer.seconds).toBe(0);
      expect(probe.timer.formattedElapsed).toBe('00:00:00');
    });

    it('1.6 handles dangling non-existent activeTaskId in timer storage without breaking workspace', async () => {
      const timerKey = `artlake_timer_${testProjectAlpha.id}_${testArtistUser.id}`;
      // Adversarial payload: timer pointing to deleted task
      localStorage.setItem(
        timerKey,
        JSON.stringify({
          activeTaskId: 'deleted-task-id-404',
          activeTaskTitle: 'Old Deleted Task',
          isRunning: false,
          startTime: null,
          accumulatedSeconds: 120,
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('active-project-name')).toHaveTextContent(testProjectAlpha.name);
      });

      // Workspace remains fully operational and loads user dashboard
      await waitFor(() => {
        expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // VECTOR 2: SESSION TERMINATION MID-OPERATION & IN-FLIGHT TIMER TICKS
  // ==========================================================================
  describe('Vector 2: Session Termination Mid-Operation & In-Flight Timer Ticks', () => {
    it('2.1 abruptly logging out while an optimistic status mutation is in flight teardowns cleanly to LoginGate', async () => {
      let probe: ProbeState = {} as ProbeState;
      renderHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks?.activeTaskId).toBe(testAlphaTask.id);
      });

      // Trigger an optimistic status change and immediately logout mid-operation
      let mutationPromise: Promise<boolean>;
      act(() => {
        mutationPromise = probe.tasks.changeStatus(testAlphaTask.id, 'in_progress');
      });

      // Immediate abrupt logout while promise is resolving
      await act(async () => {
        await probe.auth.logout();
      });

      // Verify clean transition to unauthenticated state
      expect(probe.auth.user).toBeNull();
      expect(probe.auth.session).toBeNull();
      expect(probe.auth.isAuthorized).toBe(false);

      // Verify mutation promise finishes without unhandled rejection
      const result = await mutationPromise!;
      expect(typeof result).toBe('boolean');
    });

    it('2.2 abruptly logging out while optimistic subtask insertion is in flight leaves no memory leaks', async () => {
      let probe: ProbeState = {} as ProbeState;
      renderHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks?.activeTaskId).toBe(testAlphaTask.id);
      });

      let subtaskPromise: Promise<boolean>;
      act(() => {
        subtaskPromise = probe.tasks.addSubtask(testAlphaTask.id, 'In Flight Subtask');
      });

      await act(async () => {
        await probe.auth.logout();
      });

      const res = await subtaskPromise!;
      expect(typeof res).toBe('boolean');
      expect(probe.auth.session).toBeNull();
    });

    it('2.3 abruptly logging out with a running timer tick cancels intervals and resets state cleanly', async () => {
      let probe: ProbeState = {} as ProbeState;
      renderHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks?.activeTaskId).toBe(testAlphaTask.id);
      });

      // Start the timer
      await act(async () => {
        await probe.timer.startTimer(testAlphaTask.id, testAlphaTask.title);
      });

      expect(probe.timer.isRunning).toBe(true);

      // Abruptly logout while timer is running and ticking
      await act(async () => {
        await probe.auth.logout();
      });

      expect(probe.auth.user).toBeNull();

      // Mount App again to verify subsequent session is clean and uncorrupted
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('login-gate')).toBeInTheDocument();
      });

      // Zero workspace or private task leaks in DOM
      expect(screen.queryByTestId('workspace-shell')).not.toBeInTheDocument();
      expect(screen.queryByTestId('topbar-zone-2')).not.toBeInTheDocument();
    });

    it('2.4 abruptly logging out with open manual time modal unmounts cleanly without orphaned portals', async () => {
      let probe: ProbeState = {} as ProbeState;
      renderHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.tasks?.activeTaskId).toBe(testAlphaTask.id);
      });

      // Open manual time modal
      act(() => {
        probe.timer.openManualModal();
      });
      expect(probe.timer.isManualModalOpen).toBe(true);

      // Logout mid-modal
      await act(async () => {
        await probe.auth.logout();
      });

      expect(probe.auth.session).toBeNull();
      expect(probe.auth.user).toBeNull();
    });
  });

  // ==========================================================================
  // VECTOR 3: CROSS-PROJECT ID INJECTION ATTACKS
  // ==========================================================================
  describe('Vector 3: Cross-Project ID Injection Attacks', () => {
    it('3.1 blocks cross-project task update attempts against unauthorized Project Beta (RLS 42501)', async () => {
      // User artist belongs only to Project Alpha. Attempt to modify Beta task directly.
      const { data, error } = await supabase
        .from('tasks')
        .update({ title: 'Hacked Beta Title', status: 'completed' })
        .eq('id', testBetaTask.id);

      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();

      // Database verification: Beta task title and status remain untouched
      const dbTask = mockSupabase.testUtils.getSnapshot().tasks.find((t) => t.id === testBetaTask.id);
      expect(dbTask?.title).toBe(testBetaTask.title);
      expect(dbTask?.status).toBe(testBetaTask.status);
    });

    it('3.2 blocks cross-project task deletion attempts against Project Beta (RLS 42501)', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', testBetaTask.id);

      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();

      // Task must remain in DB
      const dbTask = mockSupabase.testUtils.getSnapshot().tasks.find((t) => t.id === testBetaTask.id);
      expect(dbTask).toBeDefined();
    });

    it('3.3 blocks cross-project time logging injection attempts into Project Beta (RLS 42501)', async () => {
      // Artist attempts to inject hours into Project Beta
      const { data, error } = await supabase.from('time_logs').insert({
        project_id: testProjectBeta.id,
        user_id: testArtistUser.id,
        task_id: testBetaTask.id,
        duration_seconds: 14400,
        year_week: '2026-W45',
        started_at: new Date().toISOString(),
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();

      // Verify no unauthorized log exists in DB
      const dbLogs = mockSupabase
        .testUtils
        .getSnapshot()
        .time_logs.filter((tl) => tl.project_id === testProjectBeta.id && tl.user_id === testArtistUser.id);
      expect(dbLogs).toHaveLength(0);
    });

    it('3.4 blocks cross-project task creation injection into Project Beta (RLS 42501)', async () => {
      const { data, error } = await supabase.from('tasks').insert({
        project_id: testProjectBeta.id,
        title: 'Injected Backdoor Task',
        status: 'not_started',
        priority: 'high',
        assignee_id: testArtistUser.id,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();

      const injected = mockSupabase
        .testUtils
        .getSnapshot()
        .tasks.find((t) => t.project_id === testProjectBeta.id && t.title === 'Injected Backdoor Task');
      expect(injected).toBeUndefined();
    });

    it('3.5 blocks cross-project subtask and comment injections onto Project Beta tasks (RLS 42501)', async () => {
      // Injected Subtask
      const subtaskRes = await supabase.from('subtasks').insert({
        task_id: testBetaTask.id,
        title: 'Exploit Subtask',
        position: 99,
      });
      expect(subtaskRes.error).not.toBeNull();
      expect(subtaskRes.error?.code).toBe('42501');

      // Injected Comment
      const commentRes = await supabase.from('task_comments').insert({
        task_id: testBetaTask.id,
        author_id: testArtistUser.id,
        content: 'Exploit Comment',
      });
      expect(commentRes.error).not.toBeNull();
      expect(commentRes.error?.code).toBe('42501');
    });

    it('3.6 strictly prevents SELECT query leakage across project boundaries', async () => {
      // 1. Projects query: only Alpha returned
      const { data: projData } = await supabase.from('projects').select('*');
      expect(projData?.map((p) => p.id)).toEqual([testProjectAlpha.id]);

      // 2. Tasks query: only Alpha task returned
      const { data: tasksData } = await supabase.from('tasks').select('*');
      expect(tasksData?.map((t) => t.id)).toEqual([testAlphaTask.id]);

      // 3. Time logs query: zero Beta logs returned
      const { data: timeLogsData } = await supabase.from('time_logs').select('*');
      expect(timeLogsData?.some((tl) => tl.project_id === testProjectBeta.id)).toBe(false);

      // 4. Project members query: zero Beta members returned
      const { data: membersData } = await supabase.from('project_members').select('*');
      expect(membersData?.some((m) => m.project_id === testProjectBeta.id)).toBe(false);
    });
  });

  // ==========================================================================
  // VECTOR 4: NON-ADMIN ROLE ESCALATION ATTEMPTS
  // ==========================================================================
  describe('Vector 4: Non-Admin Role Escalation Attempts', () => {
    it('4.1 blocks non-admin from escalating their own role to admin via profile update (RLS 42501)', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', testArtistUser.id);

      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(error?.message).toContain('permission denied: cannot alter role');
      expect(data).toBeNull();

      // Verify in DB state that role remains 'user'
      const dbProfile = mockSupabase.testUtils.getSnapshot().profiles.find((p) => p.id === testArtistUser.id);
      expect(dbProfile?.role).toBe('user');
    });

    it('4.2 blocks non-admin from creating projects via context API and direct DB insert', async () => {
      let probe: ProbeState = {} as ProbeState;
      renderHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.project?.isAdmin).toBe(false);
      });

      // Context-level block
      const contextResult = await probe.project.createProject({
        name: 'Unauthorized Studio Project',
      });
      expect(contextResult.data).toBeNull();
      expect(contextResult.error).not.toBeNull();
      expect(contextResult.error?.message).toContain('Permission denied: only admins can create projects');

      // Database RLS-level block
      const dbResult = await supabase.from('projects').insert({
        name: 'Unauthorized DB Insert Project',
        created_by: testArtistUser.id,
      });
      expect(dbResult.error).not.toBeNull();
      expect(dbResult.error?.code).toBe('42501');

      // Verify no extra project created
      const allProjects = mockSupabase.testUtils.getSnapshot().projects;
      expect(allProjects.some((p) => p.name === 'Unauthorized Studio Project')).toBe(false);
      expect(allProjects.some((p) => p.name === 'Unauthorized DB Insert Project')).toBe(false);
    });

    it('4.3 blocks non-admin from updating or deleting projects via context API and direct DB calls', async () => {
      let probe: ProbeState = {} as ProbeState;
      renderHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.project?.isAdmin).toBe(false);
      });

      // Update via Context
      const updateContextRes = await probe.project.updateProject(testProjectAlpha.id, {
        name: 'Hacked Project Name',
      });
      expect(updateContextRes.data).toBeNull();
      expect(updateContextRes.error?.message).toContain('Permission denied: only admins can update projects');

      // Delete via Context
      const deleteContextRes = await probe.project.deleteProject(testProjectAlpha.id);
      expect(deleteContextRes.error?.message).toContain('Permission denied: only admins can delete projects');

      // Direct DB Delete
      const dbDeleteRes = await supabase.from('projects').delete().eq('id', testProjectAlpha.id);
      expect(dbDeleteRes.error).not.toBeNull();
      expect(dbDeleteRes.error?.code).toBe('42501');

      // Verify Project Alpha still exists and is untouched
      const alphaProj = mockSupabase.testUtils.getSnapshot().projects.find((p) => p.id === testProjectAlpha.id);
      expect(alphaProj).toBeDefined();
      expect(alphaProj?.name).toBe(testProjectAlpha.name);
    });

    it('4.4 blocks non-admin from inviting or removing project members via context API and direct DB calls', async () => {
      let probe: ProbeState = {} as ProbeState;
      renderHarness((p) => {
        probe = p;
      });

      await waitFor(() => {
        expect(probe.project?.isAdmin).toBe(false);
      });

      // Invite via Context
      const inviteContextRes = await probe.project.inviteMember(
        testProjectAlpha.id,
        'intruder@artlake.studio'
      );
      expect(inviteContextRes.data).toBeNull();
      expect(inviteContextRes.error?.message).toContain('Permission denied: only admins can invite members');

      // Remove via Context
      const removeContextRes = await probe.project.removeMember('pm-alpha-admin');
      expect(removeContextRes.error?.message).toContain('Permission denied: only admins can remove members');

      // Direct DB Insert
      const dbInviteRes = await supabase.from('project_members').insert({
        project_id: testProjectAlpha.id,
        user_email: 'intruder@artlake.studio',
      });
      expect(dbInviteRes.error).not.toBeNull();
      expect(dbInviteRes.error?.code).toBe('42501');

      // Direct DB Delete
      const dbRemoveRes = await supabase.from('project_members').delete().eq('id', 'pm-alpha-admin');
      expect(dbRemoveRes.error).not.toBeNull();
      expect(dbRemoveRes.error?.code).toBe('42501');

      // Verify membership list untouched
      const members = mockSupabase
        .testUtils
        .getSnapshot()
        .project_members.filter((pm) => pm.project_id === testProjectAlpha.id);
      expect(members.some((m) => m.user_email === 'intruder@artlake.studio')).toBe(false);
      expect(members.some((m) => m.id === 'pm-alpha-admin')).toBe(true);
    });

    it('4.5 strictly hides and denies Admin controls and views from non-admin user in DOM', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('active-project-name')).toHaveTextContent(testProjectAlpha.name);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
      });

      // Role switcher in TopBar must NOT be rendered for non-admins
      expect(screen.queryByTestId('role-switch')).not.toBeInTheDocument();
      expect(screen.queryByTestId('role-btn-admin')).not.toBeInTheDocument();

      // Studio Management section / Admin Quick Action button must NOT be rendered
      expect(screen.queryByTestId('toggle-admin-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();

      // Admin dashboard must NOT be rendered
      expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();

      // User dashboard must be rendered
      expect(screen.getByTestId('user-role-badge')).toHaveTextContent('Membro');
    });
  });
});
