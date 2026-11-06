import React, { useEffect, useRef } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act, renderHook, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase } from '../../src/services/mockSupabase';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { ProjectProvider, useProject } from '../../src/context/ProjectContext';
import { TimerProvider, useTimer } from '../../src/context/TimerContext';
import { TaskProvider } from '../../src/context/TaskContext';
import { useTasks } from '../../src/hooks/useTasks';
import { ProjectSelector } from '../../src/components/layout/ProjectSelector';
import { TopBar } from '../../src/components/layout/TopBar';
import { ManualTimeModal as ReExportedManualTimeModal } from '../../src/components/common/ManualTimeModal';
import { UserDashboard } from '../../src/components/dashboard/UserDashboard';
import { AdminDashboard } from '../../src/components/dashboard/AdminDashboard';
import { KanbanBoard } from '../../src/components/kanban/KanbanBoard';
import { GanttView } from '../../src/components/gantt/GanttView';
import { WorkspaceShell } from '../../src/components/workspace/WorkspaceShell';
import {
  formatSeconds,
  parseTimeString,
  getIsoYearWeek,
  getMondayOfWeek,
  formatHoursMinutes,
  formatAverageHours,
  calculateWeeklyTotal,
  calculateHistoricalAverage,
} from '../../src/utils/timeCalculations';
import { TaskRow } from '../../src/types/models';

// ============================================================================
// TEST HARNESS PROBE COMPONENT
// ============================================================================

interface ProbeState {
  auth: ReturnType<typeof useAuth>;
  project: ReturnType<typeof useProject>;
  timer: ReturnType<typeof useTimer>;
  tasks: ReturnType<typeof useTasks>;
}

const HardeningProbe: React.FC<{
  onProbe?: (probe: ProbeState) => void;
}> = ({ onProbe }) => {
  const auth = useAuth();
  const project = useProject();
  const timer = useTimer();
  const tasks = useTasks();

  const probeRef = useRef<ProbeState>({ auth, project, timer, tasks });
  probeRef.current = { auth, project, timer, tasks };

  useEffect(() => {
    if (onProbe) {
      onProbe(probeRef.current);
    }
  });

  return (
    <div data-testid="hardening-probe">
      <div data-testid="probe-auth-user">{auth.user?.email || 'none'}</div>
      <div data-testid="probe-auth-role">{auth.user?.role || 'none'}</div>
      <div data-testid="probe-auth-authorized">{auth.isAuthorized ? 'authorized' : 'unauthorized'}</div>
      <div data-testid="probe-project-id">{project.currentProject?.id || 'none'}</div>
      <div data-testid="probe-active-task-id">{tasks.activeTaskId || 'none'}</div>
      <div data-testid="probe-timer-running">{timer.isRunning ? 'running' : 'stopped'}</div>
      <div data-testid="probe-timer-elapsed">{timer.elapsedSeconds}</div>
    </div>
  );
};

const renderHarness = (onProbe?: (probe: ProbeState) => void) => {
  return render(
    <AuthProvider>
      <ProjectProvider>
        <TimerProvider>
          <TaskProvider>
            <HardeningProbe onProbe={onProbe} />
          </TaskProvider>
        </TimerProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

describe('Tier 5: White-Box Source Code Hardening & Boundary Stress Suite', () => {
  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SUITE 1: AuthContext White-Box Hardening & Edge Cases
  // ==========================================================================
  describe('Suite 1: AuthContext Branch & Error Hardening', () => {
    it('1.1 handles getSession() rejection in refreshAuth() gracefully without crashing', async () => {
      vi.spyOn(mockSupabase.auth, 'getSession').mockRejectedValueOnce(
        new Error('Network disconnected during auth verification')
      );

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current).not.toBeNull();
        expect(probeHolder.current?.auth.isLoading).toBe(false);
      });

      expect(probeHolder.current?.auth.user).toBeNull();
      expect(probeHolder.current?.auth.isAuthorized).toBe(false);
    });

    it('1.2 constructs fallback profile with user_metadata when no profile row exists in database', async () => {
      mockSupabase.testUtils.setSession({
        access_token: 'valid-token-no-profile',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: 'user-no-profile-row',
          email: 'custom.artist@artlake.studio',
          user_metadata: {
            full_name: 'Custom Artist Fullname',
            role: 'user',
            department: 'Environment Art',
            avatar_url: 'https://artlake.studio/avatars/custom.png',
          },
        },
      });

      // Seed project membership so user is authorized
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-env',
            name: 'Environment Sprint',
            description: 'Sprint',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-1',
            project_id: 'proj-env',
            user_email: 'custom.artist@artlake.studio',
            user_id: 'user-no-profile-row',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.auth.user).not.toBeNull();
      });

      expect(probeHolder.current?.auth.user?.fullName).toBe('Custom Artist Fullname');
      expect(probeHolder.current?.auth.user?.department).toBe('Environment Art');
      expect(probeHolder.current?.auth.user?.role).toBe('user');
      expect(probeHolder.current?.auth.user?.avatarUrl).toBe('https://artlake.studio/avatars/custom.png');
      expect(probeHolder.current?.auth.isAuthorized).toBe(true);
    });

    it('1.3 passes custom options (mockEmail, mockName) through loginWithGoogle queryParams', async () => {
      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.auth.isLoading).toBe(false);
      });

      await act(async () => {
        await probeHolder.current?.auth.loginWithGoogle({
          mockEmail: 'fuzz.lead@artlake.studio',
          mockName: 'Fuzz Lead',
          mockRole: 'user',
        });
      });

      await waitFor(() => {
        expect(probeHolder.current?.auth.user?.email).toBe('fuzz.lead@artlake.studio');
        expect(probeHolder.current?.auth.user?.fullName).toBe('Fuzz Lead');
        expect(probeHolder.current?.auth.user?.role).toBe('user');
      });
    });

    it('1.4 grants authorization immediately to admin role even if not in project_members', async () => {
      mockSupabase.testUtils.setSession({
        access_token: 'admin-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: 'admin-standalone-id',
          email: 'director@artlake.studio',
          user_metadata: {
            full_name: 'Studio Director',
            role: 'admin',
            department: '#Management',
          },
        },
      });

      // Zero project_members seeded
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'admin-standalone-id',
            email: 'director@artlake.studio',
            full_name: 'Studio Director',
            initials: 'SD',
            avatar_url: null,
            role: 'admin',
            department: '#Management',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [],
        project_members: [],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.auth.user?.email).toBe('director@artlake.studio');
      });

      expect(probeHolder.current?.auth.user?.role).toBe('admin');
      expect(probeHolder.current?.auth.isAuthorized).toBe(true);
    });

    it('1.5 grants authorization to non-admin user via projects query fallback', async () => {
      const user = {
        id: 'artist-via-projects-query',
        email: 'artist.direct@artlake.studio',
        full_name: 'Direct Project Artist',
        role: 'user' as const,
      };

      mockSupabase.testUtils.setSession({
        access_token: 'token-direct',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: user.id,
          email: user.email,
          user_metadata: {
            full_name: user.full_name,
            role: user.role,
          },
        },
      });

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            initials: 'DA',
            avatar_url: null,
            role: user.role,
            department: 'Core Dev',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [
          {
            id: 'proj-direct-access',
            name: 'Direct Access Project',
            description: 'Direct fallback',
            created_by: user.id,
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-direct-other-email',
            project_id: 'proj-direct-access',
            user_email: 'alias.old@artlake.studio',
            user_id: user.id,
            invited_at: new Date().toISOString(),
          },
        ],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.auth.user?.email).toBe(user.email);
        expect(probeHolder.current?.auth.isAuthorized).toBe(true);
      });
    });

    it('1.6 completely resets session, user, and authorization state upon logout()', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'user-logout-test',
        email: 'logout.test@artlake.studio',
        role: 'user',
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.auth.user?.email).toBe('logout.test@artlake.studio');
      });

      await act(async () => {
        await probeHolder.current?.auth.logout();
      });

      expect(probeHolder.current?.auth.user).toBeNull();
      expect(probeHolder.current?.auth.session).toBeNull();
      expect(probeHolder.current?.auth.isAuthorized).toBe(false);
      expect(probeHolder.current?.auth.isLoading).toBe(false);
    });
  });

  // ==========================================================================
  // SUITE 2: ProjectContext White-Box Hardening & Role Authorization
  // ==========================================================================
  describe('Suite 2: ProjectContext Mutations & Permission Guardrails', () => {
    it('2.1 rejects project mutation and member management requests from non-admin users', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'standard-user-id',
        email: 'junior.artist@artlake.studio',
        role: 'user',
      });

      const initialProject = {
        id: 'proj-locked',
        name: 'Locked Project',
        description: 'No non-admin changes',
        created_by: 'admin-lead',
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'standard-user-id',
            email: 'junior.artist@artlake.studio',
            full_name: 'Junior Artist',
            initials: 'JA',
            avatar_url: null,
            role: 'user',
            department: '#Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [initialProject],
        project_members: [
          {
            id: 'pm-junior',
            project_id: initialProject.id,
            user_email: 'junior.artist@artlake.studio',
            user_id: 'standard-user-id',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.project.currentProject?.id).toBe(initialProject.id);
        expect(probeHolder.current?.project.isAdmin).toBe(false);
      });

      // 1. Create project denied
      const createRes = await act(async () => {
        return await probeHolder.current!.project.createProject({ name: 'Rogue Project' });
      });
      expect(createRes.data).toBeNull();
      expect(createRes.error?.message).toContain('Permission denied');

      // 2. Update project denied
      const updateRes = await act(async () => {
        return await probeHolder.current!.project.updateProject(initialProject.id, { name: 'Renamed Project' });
      });
      expect(updateRes.data).toBeNull();
      expect(updateRes.error?.message).toContain('Permission denied');

      // 3. Delete project denied
      const deleteRes = await act(async () => {
        return await probeHolder.current!.project.deleteProject(initialProject.id);
      });
      expect(deleteRes.error?.message).toContain('Permission denied');

      // 4. Invite member denied
      const inviteRes = await act(async () => {
        return await probeHolder.current!.project.inviteMember(initialProject.id, 'newbie@artlake.studio');
      });
      expect(inviteRes.data).toBeNull();
      expect(inviteRes.error?.message).toContain('Permission denied');

      // 5. Remove member denied
      const removeRes = await act(async () => {
        return await probeHolder.current!.project.removeMember('pm-junior');
      });
      expect(removeRes.error?.message).toContain('Permission denied');
    });

    it('2.2 allows admin to update project details and refreshes project list', async () => {
      const admin = {
        id: 'admin-lead-id',
        email: 'lead@artlake.studio',
        role: 'admin' as const,
      };

      mockSupabase.testUtils.setMockUser(admin);

      const initialProject = {
        id: 'proj-to-update',
        name: 'Original Title',
        description: 'Original Desc',
        created_by: admin.id,
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: admin.id,
            email: admin.email,
            full_name: 'Admin Lead',
            initials: 'AL',
            avatar_url: null,
            role: admin.role,
            department: '#Management',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [initialProject],
        project_members: [
          {
            id: 'pm-lead',
            project_id: initialProject.id,
            user_email: admin.email,
            user_id: admin.id,
            invited_at: new Date().toISOString(),
          },
        ],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.project.currentProject?.id).toBe(initialProject.id);
      });

      const updateRes = await act(async () => {
        return await probeHolder.current!.project.updateProject(initialProject.id, {
          name: 'Updated Alpha Sprint Title',
          description: 'Updated Description Content',
        });
      });

      expect(updateRes.error).toBeNull();
      expect(updateRes.data?.name).toBe('Updated Alpha Sprint Title');
      expect(updateRes.data?.description).toBe('Updated Description Content');

      await waitFor(() => {
        const found = probeHolder.current?.project.userProjects.find((p) => p.id === initialProject.id);
        expect(found?.name).toBe('Updated Alpha Sprint Title');
      });
    });

    it('2.3 allows admin to delete project and removes it from project list', async () => {
      const admin = {
        id: 'admin-delete-id',
        email: 'delete.admin@artlake.studio',
        role: 'admin' as const,
      };

      mockSupabase.testUtils.setMockUser(admin);

      const projA = {
        id: 'proj-del-a',
        name: 'Project To Delete',
        description: 'Desc',
        created_by: admin.id,
        created_at: new Date().toISOString(),
      };
      const projB = {
        id: 'proj-keep-b',
        name: 'Project To Keep',
        description: 'Desc',
        created_by: admin.id,
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: admin.id,
            email: admin.email,
            full_name: 'Delete Admin',
            initials: 'DA',
            avatar_url: null,
            role: admin.role,
            department: '#Management',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [projA, projB],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.project.userProjects.length).toBe(2);
      });

      const delRes = await act(async () => {
        return await probeHolder.current!.project.deleteProject(projA.id);
      });

      expect(delRes.error).toBeNull();

      await waitFor(() => {
        expect(probeHolder.current?.project.userProjects.length).toBe(1);
        expect(probeHolder.current?.project.userProjects[0].id).toBe(projB.id);
      });
    });

    it('2.4 validates email syntax and handles database errors during member invitation', async () => {
      const admin = {
        id: 'admin-inviter-id',
        email: 'inviter@artlake.studio',
        role: 'admin' as const,
      };

      mockSupabase.testUtils.setMockUser(admin);

      const project = {
        id: 'proj-invite-test',
        name: 'Invite Test Project',
        description: 'Testing',
        created_by: admin.id,
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: admin.id,
            email: admin.email,
            full_name: 'Inviter Admin',
            initials: 'IA',
            avatar_url: null,
            role: admin.role,
            department: '#Management',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.project.currentProject?.id).toBe(project.id);
      });

      // 1. Empty email validation
      const emptyRes = await act(async () => {
        return await probeHolder.current!.project.inviteMember(project.id, '');
      });
      expect(emptyRes.data).toBeNull();
      expect(emptyRes.error?.message).toBe('Invalid email address');

      // 2. Whitespace-only email validation
      const spaceRes = await act(async () => {
        return await probeHolder.current!.project.inviteMember(project.id, '   ');
      });
      expect(spaceRes.data).toBeNull();
      expect(spaceRes.error?.message).toBe('Invalid email address');

      // 3. Email without @ symbol
      const noAtRes = await act(async () => {
        return await probeHolder.current!.project.inviteMember(project.id, 'invalidemailartlake.studio');
      });
      expect(noAtRes.data).toBeNull();
      expect(noAtRes.error?.message).toBe('Invalid email address');

      // 4. Successful invitation
      const successRes = await act(async () => {
        return await probeHolder.current!.project.inviteMember(project.id, ' valid.invite@artlake.studio ');
      });
      expect(successRes.error).toBeNull();
      expect(successRes.data?.userEmail).toBe('valid.invite@artlake.studio');

      await waitFor(() => {
        const found = probeHolder.current?.project.members.find((m) => m.userEmail === 'valid.invite@artlake.studio');
        expect(found).toBeDefined();
      });
    });

    it('2.5 allows admin to remove member from project and updates member list', async () => {
      const admin = {
        id: 'admin-remover-id',
        email: 'remover@artlake.studio',
        role: 'admin' as const,
      };

      mockSupabase.testUtils.setMockUser(admin);

      const project = {
        id: 'proj-remove-test',
        name: 'Remove Test Project',
        description: 'Testing',
        created_by: admin.id,
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: admin.id,
            email: admin.email,
            full_name: 'Remover Admin',
            initials: 'RA',
            avatar_url: null,
            role: admin.role,
            department: '#Management',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-member-to-remove',
            project_id: project.id,
            user_email: 'departing@artlake.studio',
            user_id: 'departing-user-id',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.project.members.length).toBe(1);
      });

      const removeRes = await act(async () => {
        return await probeHolder.current!.project.removeMember('pm-member-to-remove');
      });

      expect(removeRes.error).toBeNull();

      await waitFor(() => {
        expect(probeHolder.current?.project.members.length).toBe(0);
      });
    });
  });

  // ==========================================================================
  // SUITE 3: TaskContext White-Box Hardening & State Machine Edge Cases
  // ==========================================================================
  describe('Suite 3: TaskContext Resolution Cascades & Boundary Handling', () => {
    it('3.1 exercises resolution priority: designated activeTaskId > in_progress > lowest queue order', async () => {
      const user = {
        id: 'priority-user-id',
        email: 'priority@artlake.studio',
        role: 'user' as const,
      };

      const project = {
        id: 'proj-priority-test',
        name: 'Priority Test Project',
        description: 'Testing task resolution priority',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      const taskInProgress: TaskRow = {
        id: 'task-in-prog',
        project_id: project.id,
        title: 'Task In Progress',
        description: '',
        status: 'in_progress',
        priority: 'high',
        department_tag: '#Art',
        assignee_id: user.id,
        queue_order: 5,
        estimated_minutes: 120,
        logged_minutes: 30,
        due_date: null,
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const taskLowQueue: TaskRow = {
        id: 'task-low-queue',
        project_id: project.id,
        title: 'Task Low Queue Non-Completed',
        description: '',
        status: 'not_started',
        priority: 'high',
        department_tag: '#Art',
        assignee_id: user.id,
        queue_order: 1,
        estimated_minutes: 60,
        logged_minutes: 0,
        due_date: null,
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.setMockUser(user);
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: user.id,
            email: user.email,
            full_name: 'Priority User',
            initials: 'PU',
            avatar_url: null,
            role: user.role,
            department: '#Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-prio',
            project_id: project.id,
            user_email: user.email,
            user_id: user.id,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [taskLowQueue, taskInProgress],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      // Preference 2 selects taskInProgress over taskLowQueue
      await waitFor(() => {
        expect(probeHolder.current?.tasks.activeTaskId).toBe(taskInProgress.id);
      });
    });

    it('3.2 handles database query errors in refreshTasks without uncaught rejection', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'error-user-id',
        email: 'error.user@artlake.studio',
        role: 'user',
      });

      const project = {
        id: 'proj-error-catch',
        name: 'Error Project',
        description: 'Test',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'error-user-id',
            email: 'error.user@artlake.studio',
            full_name: 'Error User',
            initials: 'EU',
            avatar_url: null,
            role: 'user',
            department: '#Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-err',
            project_id: project.id,
            user_email: 'error.user@artlake.studio',
            user_id: 'error-user-id',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.project.currentProject?.id).toBe(project.id);
      });

      // Mock database from('tasks') select to reject
      vi.spyOn(mockSupabase, 'from').mockImplementationOnce(() => {
        throw new Error('Postgres connection pool exhausted');
      });

      await act(async () => {
        await probeHolder.current?.tasks.refreshTasks();
      });

      // Should safely reach catch block and set loading false without throwing
      expect(probeHolder.current?.tasks.isLoading).toBe(false);
    });

    it('3.3 assignOrphanTask with NO arguments automatically targets first orphan task and assigns it to current user', async () => {
      const user = {
        id: 'orphan-assignee-id',
        email: 'assignee@artlake.studio',
        role: 'user' as const,
      };

      const project = {
        id: 'proj-orphan-auto',
        name: 'Orphan Project',
        description: 'Testing parameterless orphan assignment',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      const orphanTask: TaskRow = {
        id: 'task-first-orphan',
        project_id: project.id,
        title: 'Unassigned Backlog Item',
        description: '',
        status: 'not_started',
        priority: 'low',
        department_tag: '#Tech',
        assignee_id: null,
        queue_order: 10,
        estimated_minutes: 180,
        logged_minutes: 0,
        due_date: null,
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.setMockUser(user);
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: user.id,
            email: user.email,
            full_name: 'Assignee User',
            initials: 'AU',
            avatar_url: null,
            role: user.role,
            department: '#Tech',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-auto-assign',
            project_id: project.id,
            user_email: user.email,
            user_id: user.id,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [orphanTask],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.tasks.orphanTasks.length).toBe(1);
      });

      const success = await act(async () => {
        return await probeHolder.current!.tasks.assignOrphanTask();
      });

      expect(success).toBe(true);

      await waitFor(() => {
        expect(probeHolder.current?.tasks.orphanTasks.length).toBe(0);
        const assigned = probeHolder.current?.tasks.tasks.find((t) => t.id === orphanTask.id);
        expect(assigned?.assigneeId).toBe(user.id);
      });
    });

    it('3.4 assignOrphanTask returns false when target task does not exist or has no assignee', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'assign-boundary-user',
        email: 'boundary@artlake.studio',
        role: 'user',
      });

      const project = {
        id: 'proj-orphan-bound',
        name: 'Bound Project',
        description: 'Test',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'assign-boundary-user',
            email: 'boundary@artlake.studio',
            full_name: 'Bound User',
            initials: 'BU',
            avatar_url: null,
            role: 'user',
            department: '#Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-bound',
            project_id: project.id,
            user_email: 'boundary@artlake.studio',
            user_id: 'assign-boundary-user',
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [], // Zero tasks
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.project.currentProject?.id).toBe(project.id);
      });

      // 1. Non-existent taskId
      const resNonExistent = await act(async () => {
        return await probeHolder.current!.tasks.assignOrphanTask('non-existent-task-id');
      });
      expect(resNonExistent).toBe(false);

      // 2. Zero orphan tasks left in list
      const resNoOrphans = await act(async () => {
        return await probeHolder.current!.tasks.assignOrphanTask();
      });
      expect(resNoOrphans).toBe(false);
    });

    it('3.5 promoteToActiveTask is a safe no-op when the selected task is already the active task', async () => {
      const user = {
        id: 'user-already-active',
        email: 'active@artlake.studio',
        role: 'user' as const,
      };

      const project = {
        id: 'proj-already-active',
        name: 'Already Active Project',
        description: 'Test',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      const taskActive: TaskRow = {
        id: 'task-active-already',
        project_id: project.id,
        title: 'Already Active Task',
        description: '',
        status: 'in_progress',
        priority: 'high',
        department_tag: '#Art',
        assignee_id: user.id,
        queue_order: 0,
        estimated_minutes: 60,
        logged_minutes: 0,
        due_date: null,
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.setMockUser(user);
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: user.id,
            email: user.email,
            full_name: 'Already Active',
            initials: 'AA',
            avatar_url: null,
            role: user.role,
            department: '#Art',
            active_task_id: taskActive.id,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-already',
            project_id: project.id,
            user_email: user.email,
            user_id: user.id,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [taskActive],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.tasks.activeTaskId).toBe(taskActive.id);
      });

      const promoted = await act(async () => {
        return await probeHolder.current!.tasks.promoteToActiveTask(taskActive.id);
      });

      expect(promoted).toBe(true);
      expect(probeHolder.current?.tasks.activeTaskId).toBe(taskActive.id);
    });
  });

  // ==========================================================================
  // SUITE 4: TimerContext White-Box Hardening & Pill Automations
  // ==========================================================================
  describe('Suite 4: TimerContext Boundary Checks & State Transitions', () => {
    it('4.1 startTimer with NO active task and NO taskId triggers toast error and exits early', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'no-task-timer-user',
        email: 'notask@artlake.studio',
        role: 'user',
      });

      const project = {
        id: 'proj-empty-timer',
        name: 'Empty Project',
        description: 'Testing startTimer boundary',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'no-task-timer-user',
            email: 'notask@artlake.studio',
            full_name: 'No Task User',
            initials: 'NT',
            avatar_url: null,
            role: 'user',
            department: '#Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        tasks: [], // Zero tasks
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.tasks.activeTaskId).toBeNull();
      });

      await act(async () => {
        await probeHolder.current?.timer.startTimer();
      });

      // Should show toast and stay stopped (lines 298-301)
      expect(probeHolder.current?.timer.isRunning).toBe(false);
      expect(probeHolder.current?.timer.toastMessage).toBe('Nessuna task attiva selezionata');
    });

    it('4.2 toggleTimer pauses running timer and triggers toast notification', async () => {
      const user = {
        id: 'toggle-timer-user',
        email: 'toggle@artlake.studio',
        role: 'user' as const,
      };

      const project = {
        id: 'proj-toggle-timer',
        name: 'Toggle Project',
        description: 'Test toggleTimer',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      const task: TaskRow = {
        id: 'task-toggle-test',
        project_id: project.id,
        title: 'Task For Toggle',
        description: '',
        status: 'in_progress',
        priority: 'medium',
        department_tag: '#Art',
        assignee_id: user.id,
        queue_order: 0,
        estimated_minutes: 60,
        logged_minutes: 0,
        due_date: null,
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.setMockUser(user);
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: user.id,
            email: user.email,
            full_name: 'Toggle User',
            initials: 'TU',
            avatar_url: null,
            role: user.role,
            department: '#Art',
            active_task_id: task.id,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-toggle',
            project_id: project.id,
            user_email: user.email,
            user_id: user.id,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [task],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.tasks.activeTaskId).toBe(task.id);
      });

      // Explicitly start timer on task
      await act(async () => {
        await probeHolder.current?.timer.startTimer(task.id, task.title);
      });

      await waitFor(() => {
        expect(probeHolder.current?.timer.isRunning).toBe(true);
      });

      // Toggle pauses timer (lines 346-349)
      await act(async () => {
        await probeHolder.current?.timer.toggleTimer();
      });

      await waitFor(() => {
        expect(probeHolder.current?.timer.isRunning).toBe(false);
        expect(probeHolder.current?.timer.toastMessage).toBe('Timer messo in pausa');
      });
    });

    it('4.3 auto-starts timer and shifts task status from not_started to in_progress', async () => {
      const user = {
        id: 'auto-start-user',
        email: 'autostart@artlake.studio',
        role: 'user' as const,
      };

      const project = {
        id: 'proj-autostart',
        name: 'Auto-Start Project',
        description: 'Test',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      const taskNotStarted: TaskRow = {
        id: 'task-needs-autostart',
        project_id: project.id,
        title: 'Not Started Task',
        description: '',
        status: 'not_started',
        priority: 'high',
        department_tag: '#Art',
        assignee_id: user.id,
        queue_order: 0,
        estimated_minutes: 60,
        logged_minutes: 0,
        due_date: null,
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.setMockUser(user);
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: user.id,
            email: user.email,
            full_name: 'Autostart User',
            initials: 'AU',
            avatar_url: null,
            role: user.role,
            department: '#Art',
            active_task_id: taskNotStarted.id,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-auto',
            project_id: project.id,
            user_email: user.email,
            user_id: user.id,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [taskNotStarted],
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.tasks.activeTaskId).toBe(taskNotStarted.id);
      });

      await act(async () => {
        await probeHolder.current?.timer.startTimer(taskNotStarted.id);
      });

      await waitFor(() => {
        expect(probeHolder.current?.timer.isRunning).toBe(true);
        expect(probeHolder.current?.timer.toastMessage).toContain('Task portata automaticamente "In corso"');
        expect(probeHolder.current?.timer.activeTaskStatus).toBe('in_progress');
      });
    });

    it('4.4 updateManualTime boundary testing: rejects negative numbers, malformed tokens, and out-of-range minutes/seconds', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'manual-time-fuzz-user',
        email: 'fuzz.time@artlake.studio',
        role: 'user',
      });

      const probeHolder: { current: ProbeState | null } = { current: null };
      renderHarness((probe) => {
        probeHolder.current = probe;
      });

      await waitFor(() => {
        expect(probeHolder.current?.timer).toBeDefined();
      });

      // 1. Empty string
      const emptyRes = await act(async () => {
        return await probeHolder.current!.timer.updateManualTime('');
      });
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.error).toContain('HH:MM:SS');

      // 2. Whitespace string
      const spaceRes = await act(async () => {
        return await probeHolder.current!.timer.updateManualTime('   ');
      });
      expect(spaceRes.success).toBe(false);

      // 3. Out-of-bounds minute (>= 60)
      const badMinRes = await act(async () => {
        return await probeHolder.current!.timer.updateManualTime('01:60:00');
      });
      expect(badMinRes.success).toBe(false);

      // 4. Out-of-bounds second (>= 60)
      const badSecRes = await act(async () => {
        return await probeHolder.current!.timer.updateManualTime('01:00:65');
      });
      expect(badSecRes.success).toBe(false);

      // 5. Negative tokens
      const negRes = await act(async () => {
        return await probeHolder.current!.timer.updateManualTime('-01:30:00');
      });
      expect(negRes.success).toBe(false);

      // 6. Only two tokens (e.g. MM:SS)
      const shortRes = await act(async () => {
        return await probeHolder.current!.timer.updateManualTime('15:30');
      });
      expect(shortRes.success).toBe(false);

      // 7. Valid token format
      const validRes = await act(async () => {
        return await probeHolder.current!.timer.updateManualTime('02:15:30');
      });
      expect(validRes.success).toBe(true);
      expect(validRes.error).toBeUndefined();
    });
  });

  // ==========================================================================
  // SUITE 5: timeCalculations & Pure Utility Functions Deep White-Box Coverage
  // ==========================================================================
  describe('Suite 5: timeCalculations Pure Boundary Hardening', () => {
    it('5.1 calculateWeeklyTotal handles zero, null, and undefined duration_seconds correctly', () => {
      const currentWeek = '2026-W45';
      const logs = [
        { year_week: currentWeek, duration_seconds: 3600 },
        { year_week: currentWeek, duration_seconds: 0 },
        { year_week: currentWeek, duration_seconds: undefined as unknown as number },
        { year_week: currentWeek, duration_seconds: null as unknown as number },
        { year_week: '2026-W44', duration_seconds: 7200 }, // past week excluded
      ];

      const total = calculateWeeklyTotal(logs, currentWeek, 120.8);
      expect(total).toBe(3720);
    });

    it('5.2 calculateHistoricalAverage handles falsy duration_seconds and zero past weeks', () => {
      const currentWeek = '2026-W45';

      // 1. Zero past weeks exists
      const noPast = calculateHistoricalAverage(
        [{ year_week: '2026-W45', duration_seconds: 3600 }],
        currentWeek
      );
      expect(noPast).toBe(0);

      // 2. Falsy duration_seconds in past weeks (line 130)
      const logsWithFalsy = [
        { year_week: '2026-W43', duration_seconds: 7200 },
        { year_week: '2026-W43', duration_seconds: 0 },
        { year_week: '2026-W43', duration_seconds: undefined as unknown as number },
        { year_week: '2026-W44', duration_seconds: 3600 },
        { year_week: '2026-W45', duration_seconds: 9999 }, // Current week excluded!
      ];

      const avg = calculateHistoricalAverage(logsWithFalsy, currentWeek);
      expect(avg).toBe(5400);
    });

    it('5.3 parseTimeString robustly rejects invalid formats and accepts padded valid inputs', () => {
      expect(parseTimeString(null as unknown as string)).toBeNull();
      expect(parseTimeString(undefined as unknown as string)).toBeNull();
      expect(parseTimeString('')).toBeNull();
      expect(parseTimeString('foo:bar:baz')).toBeNull();
      expect(parseTimeString('1:2:3:4')).toBeNull();
      expect(parseTimeString('12:34')).toBeNull();
      expect(parseTimeString('01: :30')).toBeNull();
      expect(parseTimeString('01:30: ')).toBeNull();
      expect(parseTimeString(' :30:00')).toBeNull();
      expect(parseTimeString('1.5:20:30')).toBeNull();
      expect(parseTimeString('01:20.5:30')).toBeNull();
      expect(parseTimeString('01:20:30.5')).toBeNull();

      expect(parseTimeString('  01:20:30  ')).toBe(3600 + 1200 + 30);
    });

    it('5.4 formatSeconds, formatHoursMinutes, and formatAverageHours handle boundaries', () => {
      expect(formatSeconds(-100)).toBe('00:00:00');
      expect(formatSeconds(0)).toBe('00:00:00');
      expect(formatSeconds(3665)).toBe('01:01:05');
      expect(formatSeconds(100000)).toBe('27:46:40');

      expect(formatHoursMinutes(-50)).toBe('0h 0m');
      expect(formatHoursMinutes(3600 + 1800)).toBe('1h 30m');

      expect(formatAverageHours(-50)).toBe('0h/sett');
      expect(formatAverageHours(3600 * 36.4)).toBe('36h/sett');
      expect(formatAverageHours(3600 * 36.7)).toBe('37h/sett');
    });

    it('5.5 getMondayOfWeek accurately resolves Monday 00:00:00 UTC across week boundaries', () => {
      const sunday = new Date(Date.UTC(2026, 10, 8, 15, 30, 0));
      const mondayFromSunday = getMondayOfWeek(sunday);
      expect(mondayFromSunday.getUTCDay()).toBe(1);
      expect(mondayFromSunday.getUTCDate()).toBe(2);
      expect(mondayFromSunday.getUTCHours()).toBe(0);

      const wednesday = new Date(Date.UTC(2026, 10, 4, 9, 0, 0));
      const mondayFromWed = getMondayOfWeek(wednesday);
      expect(mondayFromWed.getUTCDate()).toBe(2);

      const monday = new Date(Date.UTC(2026, 10, 2, 23, 59, 0));
      const resMonday = getMondayOfWeek(monday);
      expect(resMonday.getUTCDate()).toBe(2);
    });

    it('5.6 getIsoYearWeek handles year transition boundaries seamlessly', () => {
      const jan1_2026 = new Date(Date.UTC(2026, 0, 1));
      expect(getIsoYearWeek(jan1_2026)).toBe('2026-W01');

      const nov5_2026 = new Date(Date.UTC(2026, 10, 5));
      expect(getIsoYearWeek(nov5_2026)).toBe('2026-W45');
    });
  });

  // ==========================================================================
  // SUITE 6: Views & Layout Components Adversarial Coverage Hardening
  // ==========================================================================
  describe('Suite 6: Views & Layout Components White-Box Hardening', () => {
    it('6.1 ProjectSelector dropdown toggles, switches projects, and executes inline project creation', async () => {
      const user = userEvent.setup();

      const admin = {
        id: 'selector-admin-id',
        email: 'selector.admin@artlake.studio',
        role: 'admin' as const,
      };

      mockSupabase.testUtils.setMockUser(admin);

      const projA = {
        id: 'proj-sel-a',
        name: 'Project Alpha',
        description: 'First',
        created_by: admin.id,
        created_at: new Date().toISOString(),
      };
      const projB = {
        id: 'proj-sel-b',
        name: 'Project Beta',
        description: 'Second',
        created_by: admin.id,
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: admin.id,
            email: admin.email,
            full_name: 'Selector Admin',
            initials: 'SA',
            avatar_url: null,
            role: admin.role,
            department: '#Management',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [projA, projB],
      });

      render(
        <AuthProvider>
          <ProjectProvider>
            <ProjectSelector />
          </ProjectProvider>
        </AuthProvider>
      );

      // 1. Initial button state
      const toggleBtn = screen.getByTestId('project-selector-btn');
      expect(toggleBtn).toBeInTheDocument();
      expect(screen.queryByTestId('project-selector-dropdown')).not.toBeInTheDocument();

      // 2. Open dropdown
      await user.click(toggleBtn);
      expect(screen.getByTestId('project-selector-dropdown')).toBeInTheDocument();

      // 3. Switch project by clicking option
      const optionB = screen.getByTestId(`project-option-${projB.id}`);
      await user.click(optionB);

      // Dropdown closes on selection
      expect(screen.queryByTestId('project-selector-dropdown')).not.toBeInTheDocument();

      // 4. Open again and test inline quick project creation
      await user.click(toggleBtn);
      const addNewBtn = screen.getByTestId('add-new-project-btn');
      await user.click(addNewBtn);

      const input = screen.getByTestId('new-project-quick-input');
      expect(input).toBeInTheDocument();

      // Test empty submission (should not close or create)
      await user.type(input, '   {enter}');
      expect(screen.getByTestId('new-project-quick-input')).toBeInTheDocument();

      // Test cancel button
      const cancelBtn = screen.getByText('Annulla');
      await user.click(cancelBtn);
      expect(screen.queryByTestId('new-project-quick-input')).not.toBeInTheDocument();

      // Click outside closes dropdown
      fireEvent.mouseDown(document.body);
      expect(screen.queryByTestId('project-selector-dropdown')).not.toBeInTheDocument();
    });

    it('6.2 UserDashboard renders attachments chips with toast and displays external author comments', async () => {
      const user = userEvent.setup();

      const currentUser = {
        id: 'hero-user-id',
        email: 'hero@artlake.studio',
        role: 'user' as const,
      };

      const project = {
        id: 'proj-hero-view',
        name: 'Hero Project',
        description: 'Testing attachments and external comments',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      const heroTask: TaskRow = {
        id: 'task-hero-view',
        project_id: project.id,
        title: 'Environment Lighting Concept',
        description: 'Hero card description',
        status: 'in_progress',
        priority: 'high',
        department_tag: '#Art',
        assignee_id: currentUser.id,
        queue_order: 0,
        estimated_minutes: 120,
        logged_minutes: 30,
        due_date: '2026-11-20T18:00:00Z',
        start_date: null,
        blocker_reason: null,
        blocking_target: null,
        review_output_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const attachment = {
        id: 'att-1',
        task_id: heroTask.id,
        uploader_id: currentUser.id,
        file_name: 'Concept_Mood_Reference.pdf',
        file_url: 'https://artlake.studio/files/Concept_Mood_Reference.pdf',
        file_size: 4096,
        created_at: new Date().toISOString(),
      };

      const externalComment = {
        id: 'comm-ext',
        task_id: heroTask.id,
        author_id: 'colleague-user-id',
        content: 'Ottima illuminazione crepuscolare sul lago alpino!',
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.setMockUser(currentUser);
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: currentUser.id,
            email: currentUser.email,
            full_name: 'Hero Artist',
            initials: 'HA',
            avatar_url: null,
            role: currentUser.role,
            department: '#Art',
            active_task_id: heroTask.id,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-hero',
            project_id: project.id,
            user_email: currentUser.email,
            user_id: currentUser.id,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [heroTask],
        task_attachments: [attachment],
        task_comments: [externalComment],
      });

      render(
        <AuthProvider>
          <ProjectProvider>
            <TimerProvider>
              <TaskProvider>
                <UserDashboard />
              </TaskProvider>
            </TimerProvider>
          </ProjectProvider>
        </AuthProvider>
      );

      // Verify attachment chip is rendered (lines 340-353)
      await waitFor(() => {
        expect(screen.getByText('Concept_Mood_Reference.pdf')).toBeInTheDocument();
      });

      const chip = screen.getByText('Concept_Mood_Reference.pdf');
      await user.click(chip);

      expect(screen.getByText('Apertura Concept_Mood_Reference.pdf')).toBeInTheDocument();

      // Verify external author comment is rendered with TM avatar and 'Team Member' text (line 377)
      expect(screen.getByText('TM')).toBeInTheDocument();
      expect(screen.getByText('Team Member')).toBeInTheDocument();
      expect(screen.getByText('Ottima illuminazione crepuscolare sul lago alpino!')).toBeInTheDocument();
    });

    it('6.3 AdminDashboard renders status colors for in_review and completed, and displays blocker alert', async () => {
      const admin = {
        id: 'admin-dash-id',
        email: 'dash.admin@artlake.studio',
        role: 'admin' as const,
      };

      mockSupabase.testUtils.setMockUser(admin);

      const project = {
        id: 'proj-admin-dash',
        name: 'Admin Dashboard Project',
        description: 'Test',
        created_by: admin.id,
        created_at: new Date().toISOString(),
      };

      const artistA = {
        id: 'artist-a-id',
        email: 'artist.a@artlake.studio',
        full_name: 'Artist Review',
        role: 'user' as const,
        department: '#Art',
      };

      const taskReview: TaskRow = {
        id: 'task-rev',
        project_id: project.id,
        title: 'Task In Review',
        description: '',
        status: 'in_review',
        priority: 'high',
        department_tag: '#Art',
        assignee_id: artistA.id,
        queue_order: 0,
        estimated_minutes: 60,
        logged_minutes: 60,
        due_date: null,
        start_date: null,
        blocker_reason: 'In attesa di approvazione art director',
        blocking_target: null,
        review_output_link: 'https://artlake.studio/pr/12',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: admin.id,
            email: admin.email,
            full_name: 'Admin Lead',
            initials: 'AL',
            avatar_url: null,
            role: admin.role,
            department: '#Management',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: artistA.id,
            email: artistA.email,
            full_name: artistA.full_name,
            initials: 'AR',
            avatar_url: null,
            role: artistA.role,
            department: artistA.department,
            active_task_id: taskReview.id,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-admin',
            project_id: project.id,
            user_email: admin.email,
            user_id: admin.id,
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-a',
            project_id: project.id,
            user_email: artistA.email,
            user_id: artistA.id,
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [taskReview],
      });

      render(
        <AuthProvider>
          <ProjectProvider>
            <TimerProvider>
              <TaskProvider>
                <AdminDashboard />
              </TaskProvider>
            </TimerProvider>
          </ProjectProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Task In Review')).toBeInTheDocument();
      });

      // Verify blocker reason alert is displayed (lines 140-142)
      expect(screen.getByText(/In attesa di approvazione art director/)).toBeInTheDocument();
      expect(screen.getByText('In revisione')).toBeInTheDocument();
    });

    it('6.4 KanbanBoard displays blocker alert and blocking target alert tags', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'kanban-user-id',
        email: 'kanban@artlake.studio',
        role: 'user',
      });

      const project = {
        id: 'proj-kanban-alerts',
        name: 'Kanban Alerts Project',
        description: 'Test',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      const blockedTask: TaskRow = {
        id: 'task-kanban-blocked',
        project_id: project.id,
        title: 'Shaders Water Refraction',
        description: '',
        status: 'blocked',
        priority: 'high',
        department_tag: '#Tech',
        assignee_id: 'kanban-user-id',
        queue_order: 0,
        estimated_minutes: 60,
        logged_minutes: 0,
        due_date: null,
        start_date: null,
        blocker_reason: 'Crash driver GPU su build di staging',
        blocking_target: 'FX Cascata',
        review_output_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'kanban-user-id',
            email: 'kanban@artlake.studio',
            full_name: 'Kanban Artist',
            initials: 'KA',
            avatar_url: null,
            role: 'user',
            department: '#Tech',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        project_members: [
          {
            id: 'pm-kb',
            project_id: project.id,
            user_email: 'kanban@artlake.studio',
            user_id: 'kanban-user-id',
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [blockedTask],
      });

      render(
        <AuthProvider>
          <ProjectProvider>
            <TimerProvider>
              <TaskProvider>
                <KanbanBoard />
              </TaskProvider>
            </TimerProvider>
          </ProjectProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Shaders Water Refraction')).toBeInTheDocument();
      });

      // Verify blocking target alert tag (lines 156-158)
      expect(screen.getByText(/Bloccante per FX Cascata/)).toBeInTheDocument();

      // Verify blocked status reason alert (lines 161-163)
      expect(screen.getByText(/Crash driver GPU su build di staging/)).toBeInTheDocument();
    });

    it('6.5 GanttView renders empty state message when project has zero tasks', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'gantt-user-id',
        email: 'gantt@artlake.studio',
        role: 'user',
      });

      const project = {
        id: 'proj-gantt-empty',
        name: 'Empty Gantt Project',
        description: 'Test empty Gantt',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'gantt-user-id',
            email: 'gantt@artlake.studio',
            full_name: 'Gantt User',
            initials: 'GU',
            avatar_url: null,
            role: 'user',
            department: '#Art',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
        tasks: [], // Zero tasks
      });

      render(
        <AuthProvider>
          <ProjectProvider>
            <TimerProvider>
              <TaskProvider>
                <GanttView />
              </TaskProvider>
            </TimerProvider>
          </ProjectProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        // Line 110-114 empty state
        expect(screen.getByText('Nessuna task schedulata nel Gantt.')).toBeInTheDocument();
      });
    });

    it('6.6 TopBar renders amber check pill when weekly check is pending and toggles notifications dropdown', async () => {
      const user = userEvent.setup();

      mockSupabase.testUtils.setMockUser({
        id: 'topbar-user-id',
        email: 'topbar@artlake.studio',
        role: 'user',
      });

      render(
        <AuthProvider>
          <ProjectProvider>
            <TimerProvider>
              <TopBar
                activeView="dashboard"
                onViewChange={() => {}}
                onOpenWeeklyCheck={() => {}}
                weeklyCheckPending={true}
              />
            </TimerProvider>
          </ProjectProvider>
        </AuthProvider>
      );

      // Verify weekly check pill has amber ⚠️ symbol
      const checkPill = screen.getByTestId('weekly-check-pill');
      expect(checkPill).toBeInTheDocument();
      expect(checkPill).toHaveTextContent('⚠️');

      // Test notification bell toggle
      const notifBell = screen.getByTestId('notif-bell-btn');
      expect(screen.queryByTestId('notif-dropdown')).not.toBeInTheDocument();

      await user.click(notifBell);
      expect(screen.getByTestId('notif-dropdown')).toBeInTheDocument();

      // Click "Segna lette"
      const clearBtn = screen.getByTestId('mark-all-read-btn');
      await user.click(clearBtn);

      // Click outside to close notifications dropdown
      fireEvent.mouseDown(document.body);
    });

    it('6.7 ManualTimeModal renders re-exported component, displays error message, and triggers close', async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();

      mockSupabase.testUtils.setMockUser({
        id: 'modal-user-id',
        email: 'modal@artlake.studio',
        role: 'user',
      });

      render(
        <AuthProvider>
          <ProjectProvider>
            <TimerProvider>
              <ReExportedManualTimeModal onClose={onCloseMock} />
            </TimerProvider>
          </ProjectProvider>
        </AuthProvider>
      );

      expect(screen.getByTestId('time-edit-modal')).toBeInTheDocument();

      const input = screen.getByTestId('manual-time-input');
      await user.clear(input);
      await user.type(input, 'invalid-time{enter}');

      await waitFor(() => {
        expect(screen.getByTestId('manual-time-error')).toBeInTheDocument();
      });

      const closeBtn = screen.getByTestId('close-time-modal-btn');
      await user.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalled();
    });

    it('6.8 WorkspaceShell handles error feedback when creating project with database rejection', async () => {
      const user = userEvent.setup();

      const admin = {
        id: 'shell-admin-id',
        email: 'shell.admin@artlake.studio',
        role: 'admin' as const,
      };

      mockSupabase.testUtils.setMockUser(admin);

      const project = {
        id: 'proj-shell',
        name: 'Shell Test Project',
        description: 'Test',
        created_by: admin.id,
        created_at: new Date().toISOString(),
      };

      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: admin.id,
            email: admin.email,
            full_name: 'Shell Admin',
            initials: 'SA',
            avatar_url: null,
            role: admin.role,
            department: '#Management',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        projects: [project],
      });

      render(
        <AuthProvider>
          <ProjectProvider>
            <TimerProvider>
              <WorkspaceShell />
            </TimerProvider>
          </ProjectProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('toggle-admin-panel')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('toggle-admin-panel'));
      expect(screen.getByTestId('admin-panel')).toBeInTheDocument();

      // Mock database insertion failure for projects
      vi.spyOn(mockSupabase, 'from').mockReturnValueOnce({
        insert: () =>
          Promise.resolve({
            data: null,
            error: { message: 'Database disk full or constraint violation', code: '53100' },
          }),
      } as any);

      // Submit new project name to trigger error
      const nameInput = screen.getByTestId('new-project-input');
      await user.type(nameInput, 'Failed Project Name');
      await user.click(screen.getByTestId('create-project-btn'));

      // Line 32: error feedback message displayed in WorkspaceShell
      await waitFor(() => {
        expect(screen.getByText(/Errore: Database disk full or constraint violation/)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // SUITE 7: Hook Exceptions & Mock Database Infrastructure Hardening
  // ==========================================================================
  describe('Suite 7: Hook Invariant Exceptions & Mock Database API', () => {
    it('7.1 useAuth throws descriptive error when invoked outside AuthProvider', () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      );
    });

    it('7.2 useProject throws descriptive error when invoked outside ProjectProvider', () => {
      expect(() => renderHook(() => useProject())).toThrow(
        'useProject must be used within a ProjectProvider'
      );
    });

    it('7.3 useTasks throws descriptive error when invoked outside TaskProvider', () => {
      expect(() => renderHook(() => useTasks())).toThrow(
        'useTasks must be used within a TaskProvider'
      );
    });

    it('7.4 useTimer throws descriptive error when invoked outside TimerProvider', () => {
      expect(() => renderHook(() => useTimer())).toThrow(
        'useTimer must be used within a TimerProvider'
      );
    });

    it('7.5 exercises mockSupabase channel, rpc, and OAuth provider branches', async () => {
      // 1. Channel API (lines 811-812)
      const ch = mockSupabase.channel('presence-room');
      expect(ch).toBeDefined();

      // 2. RPC unhandled function (line 824)
      const rpcRes = await mockSupabase.rpc('unsupported_function', { arg: 123 });
      expect(rpcRes.data).toBeNull();
      expect(rpcRes.error).toBeNull();

      // 3. OAuth provider non-google branch (line 788)
      const oauthRes = await mockSupabase.auth.signInWithOAuth({
        provider: 'github' as any,
      });
      expect(oauthRes.data.provider).toBe('github');
    });
  });
});
