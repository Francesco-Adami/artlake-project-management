import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/App';
import { mockSupabase } from '../../src/services/mockSupabase';
import { ProjectProvider, useProject, ProjectContextType } from '../../src/context/ProjectContext';
import { AuthProvider } from '../../src/context/AuthContext';

// Helper hook inspector component
let hookContext: ProjectContextType | null = null;
const HookConsumer: React.FC = () => {
  hookContext = useProject();
  return (
    <div>
      <span data-testid="hook-current-project">{hookContext.currentProject?.name || 'none'}</span>
      <span data-testid="hook-current-project-id">{hookContext.currentProject?.id || 'none'}</span>
      <span data-testid="hook-is-admin">{hookContext.isAdmin ? 'true' : 'false'}</span>
      <span data-testid="hook-projects-count">{hookContext.userProjects.length}</span>
      <span data-testid="hook-members-count">{hookContext.members.length}</span>
    </div>
  );
};

const renderWithProviders = () => {
  return render(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        ProjectProvider,
        null,
        React.createElement(HookConsumer)
      )
    )
  );
};

describe('Milestone 2 Adversarial Stress Test: Multi-Project & Role Isolation', () => {
  beforeEach(() => {
    hookContext = null;
    mockSupabase.testUtils.resetDatabase();
    window.localStorage.clear();
  });

  // ==========================================================================
  // VECTOR 1: NON-ADMIN ROLE PERMISSIONS & DIRECT TAMPER RESISTANCE
  // ==========================================================================
  describe('Vector 1: Non-Admin Role Permissions & Mutation Resistance', () => {
    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-member-1',
            name: 'ArtLake Core Game',
            description: 'Main project',
            created_by: 'admin-1',
            created_at: new Date().toISOString(),
          },
          {
            id: 'proj-admin-secret',
            name: 'Classified Admin Studio',
            description: 'Top secret',
            created_by: 'admin-1',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-regular-1',
            project_id: 'proj-member-1',
            user_email: 'regular.dev@artlake.studio',
            user_id: 'user-regular-id',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      mockSupabase.testUtils.setMockUser({
        id: 'user-regular-id',
        email: 'regular.dev@artlake.studio',
        role: 'user',
        full_name: 'Regular Developer',
      });
    });

    it('1.1 Non-admin cannot invoke createProject (rejected with permission error)', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-member-1');
      });

      expect(hookContext?.isAdmin).toBe(false);

      let result: any = null;
      await act(async () => {
        result = await hookContext?.createProject({ name: 'Malicious Project' });
      });

      expect(result).not.toBeNull();
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toMatch(/Permission denied.*admin/i);

      // Verify DB was NOT mutated
      const snapshot = mockSupabase.testUtils.getSnapshot();
      expect(snapshot.projects.length).toBe(2);
      expect(snapshot.projects.find((p) => p.name === 'Malicious Project')).toBeUndefined();
    });

    it('1.2 Non-admin cannot invoke updateProject (rejected with permission error)', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-member-1');
      });

      let result: any = null;
      await act(async () => {
        result = await hookContext?.updateProject('proj-member-1', { name: 'Defaced Project Name' });
      });

      expect(result).not.toBeNull();
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toMatch(/Permission denied.*admin/i);

      // Verify DB was NOT modified
      const snapshot = mockSupabase.testUtils.getSnapshot();
      const proj = snapshot.projects.find((p) => p.id === 'proj-member-1');
      expect(proj?.name).toBe('ArtLake Core Game');
    });

    it('1.3 Non-admin cannot invoke deleteProject (rejected with permission error)', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-member-1');
      });

      let result: any = null;
      await act(async () => {
        result = await hookContext?.deleteProject('proj-member-1');
      });

      expect(result).not.toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toMatch(/Permission denied.*admin/i);

      // Verify DB project still exists
      const snapshot = mockSupabase.testUtils.getSnapshot();
      expect(snapshot.projects.find((p) => p.id === 'proj-member-1')).toBeDefined();
    });

    it('1.4 Non-admin cannot invoke inviteMember (rejected with permission error)', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-member-1');
      });

      let result: any = null;
      await act(async () => {
        result = await hookContext?.inviteMember('proj-member-1', 'intruder@evil.com');
      });

      expect(result).not.toBeNull();
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toMatch(/Permission denied.*admin/i);

      // Verify membership list untouched
      const snapshot = mockSupabase.testUtils.getSnapshot();
      expect(snapshot.project_members.find((pm) => pm.user_email === 'intruder@evil.com')).toBeUndefined();
    });

    it('1.5 Non-admin cannot invoke removeMember (rejected with permission error)', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-member-1');
      });

      let result: any = null;
      await act(async () => {
        result = await hookContext?.removeMember('pm-regular-1');
      });

      expect(result).not.toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toMatch(/Permission denied.*admin/i);

      // Verify membership is still present
      const snapshot = mockSupabase.testUtils.getSnapshot();
      expect(snapshot.project_members.find((pm) => pm.id === 'pm-regular-1')).toBeDefined();
    });

    it('1.6 Full App UI completely denies admin controls to non-admin users', async () => {
      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('toggle-admin-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('new-project-input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('create-project-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('invite-email-input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('invite-btn')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // VECTOR 2: LOCALSTORAGE TAMPERING & FOREIGN PROJECT SPOOFING
  // ==========================================================================
  describe('Vector 2: LocalStorage Tampering & Fallback Security', () => {
    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-user-legit',
            name: 'Legit Project',
            description: 'Assigned to user',
            created_by: 'admin-1',
            created_at: new Date().toISOString(),
          },
          {
            id: 'proj-foreign-classified',
            name: 'Classified Foreign Project',
            description: 'Financial & HR data',
            created_by: 'admin-1',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-user-1',
            project_id: 'proj-user-legit',
            user_email: 'staff@artlake.studio',
            user_id: 'staff-uid',
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-foreign-1',
            project_id: 'proj-foreign-classified',
            user_email: 'cfo@artlake.studio',
            user_id: 'cfo-uid',
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 'task-foreign-1',
            project_id: 'proj-foreign-classified',
            title: 'Confidential Salary Review',
            description: 'Secret',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#HR',
            assignee_id: 'cfo-uid',
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
          },
        ],
      });

      mockSupabase.testUtils.setMockUser({
        id: 'staff-uid',
        email: 'staff@artlake.studio',
        role: 'user',
      });
    });

    it('2.1 LocalStorage seeded with foreign project ID safely falls back to assigned project and overwrites storage', async () => {
      // Attacker pre-populates localStorage with foreign unassigned project ID
      window.localStorage.setItem('artlake_active_project_id', 'proj-foreign-classified');

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-user-legit');
      });

      expect(hookContext?.currentProject?.id).toBe('proj-user-legit');
      expect(hookContext?.currentProject?.name).toBe('Legit Project');

      // Verify localStorage was sanitized / overwritten with user's valid project
      expect(window.localStorage.getItem('artlake_active_project_id')).toBe('proj-user-legit');

      // Members must strictly belong to the legit project
      await waitFor(() => {
        expect(hookContext?.members.length).toBe(1);
      });
      expect(hookContext?.members[0].userEmail).toBe('staff@artlake.studio');
      expect(hookContext?.members.find((m) => m.userEmail === 'cfo@artlake.studio')).toBeUndefined();
    });

    it('2.2 LocalStorage seeded with path traversal / XSS / arbitrary string falls back safely without crash', async () => {
      window.localStorage.setItem('artlake_active_project_id', '../../../etc/passwd');

      const { unmount } = renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-user-legit');
      });

      expect(hookContext?.currentProject?.id).toBe('proj-user-legit');
      expect(window.localStorage.getItem('artlake_active_project_id')).toBe('proj-user-legit');

      unmount();

      // Test with XSS script tag
      window.localStorage.setItem('artlake_active_project_id', '<script>alert("xss")</script>');
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-user-legit');
      });
      expect(hookContext?.currentProject?.id).toBe('proj-user-legit');
    });

    it('2.3 selectProject ignores foreign project ID and does not leak or switch state', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-user-legit');
      });

      // User calls selectProject with foreign ID
      act(() => {
        hookContext?.selectProject('proj-foreign-classified');
      });

      // Active project remains legit
      expect(hookContext?.currentProject?.id).toBe('proj-user-legit');
      expect(window.localStorage.getItem('artlake_active_project_id')).toBe('proj-user-legit');

      // Database query for foreign tasks returns empty array due to RLS
      const { data: tasks } = await mockSupabase
        .from('tasks')
        .select('*')
        .eq('project_id', 'proj-foreign-classified');
      expect(tasks).toEqual([]);
    });
  });

  // ==========================================================================
  // VECTOR 3: MULTI-PROJECT ASSIGNMENT & CLEAN SCOPE SWITCHING
  // ==========================================================================
  describe('Vector 3: Multi-Project Assignment & Clean Scope Switching', () => {
    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-alpha',
            name: 'Project Alpha',
            description: 'Alpha workspace',
            created_by: 'admin-1',
            created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
          },
          {
            id: 'proj-beta',
            name: 'Project Beta',
            description: 'Beta workspace',
            created_by: 'admin-1',
            created_at: new Date('2026-01-02T00:00:00Z').toISOString(),
          },
          {
            id: 'proj-gamma-unassigned',
            name: 'Project Gamma',
            description: 'Gamma secret workspace',
            created_by: 'admin-1',
            created_at: new Date('2026-01-03T00:00:00Z').toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-a-1',
            project_id: 'proj-alpha',
            user_email: 'multi@artlake.studio',
            user_id: 'multi-uid',
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-a-2',
            project_id: 'proj-alpha',
            user_email: 'alice@artlake.studio',
            user_id: 'alice-uid',
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-b-1',
            project_id: 'proj-beta',
            user_email: 'multi@artlake.studio',
            user_id: 'multi-uid',
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-b-2',
            project_id: 'proj-beta',
            user_email: 'bob@artlake.studio',
            user_id: 'bob-uid',
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-g-1',
            project_id: 'proj-gamma-unassigned',
            user_email: 'stranger@artlake.studio',
            user_id: 'stranger-uid',
            invited_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 'task-alpha-1',
            project_id: 'proj-alpha',
            title: 'Alpha Engine Build',
            description: '',
            status: 'not_started',
            priority: 'high',
            department_tag: '#Dev',
            assignee_id: 'multi-uid',
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
          },
          {
            id: 'task-beta-1',
            project_id: 'proj-beta',
            title: 'Beta Shaders Pass',
            description: '',
            status: 'in_progress',
            priority: 'medium',
            department_tag: '#Art',
            assignee_id: 'multi-uid',
            queue_order: 1,
            estimated_minutes: 120,
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
      });

      mockSupabase.testUtils.setMockUser({
        id: 'multi-uid',
        email: 'multi@artlake.studio',
        role: 'user',
      });
    });

    it('3.1 Multi-project user sees exactly assigned projects and excludes unassigned ones', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-projects-count')).toHaveTextContent('2');
      });

      const userProjIds = hookContext?.userProjects.map((p) => p.id) || [];
      expect(userProjIds).toContain('proj-alpha');
      expect(userProjIds).toContain('proj-beta');
      expect(userProjIds).not.toContain('proj-gamma-unassigned');
    });

    it('3.2 Switching projects updates currentProject, localStorage, and isolates members correctly', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).not.toHaveTextContent('none');
      });

      // Switch explicitly to Project Alpha
      await act(async () => {
        hookContext?.selectProject('proj-alpha');
      });

      expect(hookContext?.currentProject?.id).toBe('proj-alpha');
      expect(window.localStorage.getItem('artlake_active_project_id')).toBe('proj-alpha');

      await waitFor(() => {
        expect(hookContext?.members.length).toBe(2);
      });
      const alphaMemberEmails = hookContext?.members.map((m) => m.userEmail);
      expect(alphaMemberEmails).toContain('multi@artlake.studio');
      expect(alphaMemberEmails).toContain('alice@artlake.studio');
      expect(alphaMemberEmails).not.toContain('bob@artlake.studio');

      // Now switch to Project Beta
      await act(async () => {
        hookContext?.selectProject('proj-beta');
      });

      expect(hookContext?.currentProject?.id).toBe('proj-beta');
      expect(window.localStorage.getItem('artlake_active_project_id')).toBe('proj-beta');

      await waitFor(() => {
        const betaEmails = hookContext?.members.map((m) => m.userEmail);
        expect(betaEmails).toContain('bob@artlake.studio');
      });
      const betaMemberEmails = hookContext?.members.map((m) => m.userEmail);
      expect(betaMemberEmails).toContain('multi@artlake.studio');
      expect(betaMemberEmails).toContain('bob@artlake.studio');
      expect(betaMemberEmails).not.toContain('alice@artlake.studio');
    });

    it('3.3 Switching active project scopes subsequent operational queries (tasks) cleanly', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).not.toHaveTextContent('none');
      });

      // Alpha active
      await act(async () => {
        hookContext?.selectProject('proj-alpha');
      });

      const { data: alphaTasks } = await mockSupabase
        .from('tasks')
        .select('*')
        .eq('project_id', hookContext!.currentProject!.id);

      expect(alphaTasks?.length).toBe(1);
      expect(alphaTasks?.[0].title).toBe('Alpha Engine Build');

      // Switch to Beta
      await act(async () => {
        hookContext?.selectProject('proj-beta');
      });

      const { data: betaTasks } = await mockSupabase
        .from('tasks')
        .select('*')
        .eq('project_id', hookContext!.currentProject!.id);

      expect(betaTasks?.length).toBe(1);
      expect(betaTasks?.[0].title).toBe('Beta Shaders Pass');
    });

    it('3.4 Full WorkspaceShell UI project switcher reflects multi-project state correctly', async () => {
      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      });

      const selector = screen.getByTestId('project-selector') as HTMLSelectElement;
      await waitFor(() => {
        expect(selector.options.length).toBe(2);
      });

      // Select Project Beta
      await userEvent.selectOptions(selector, 'proj-beta');

      await waitFor(() => {
        expect(screen.getByTestId('active-project-name')).toHaveTextContent('Project Beta');
      });

      expect(screen.getByTestId('members-list')).toHaveTextContent('bob@artlake.studio');
      expect(screen.getByTestId('members-list')).not.toHaveTextContent('alice@artlake.studio');
    });
  });

  // ==========================================================================
  // VECTOR 4: ADMIN PROJECT DELETION & AUTO-SWITCHING / FALLBACK
  // ==========================================================================
  describe('Vector 4: Admin Project Deletion & Automatic Fallback', () => {
    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-del-1',
            name: 'Project to Delete',
            description: 'Will be removed',
            created_by: 'admin-lead-id',
            created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
          },
          {
            id: 'proj-survivor-2',
            name: 'Surviving Project',
            description: 'Will remain active',
            created_by: 'admin-lead-id',
            created_at: new Date('2026-01-02T00:00:00Z').toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-del-1',
            project_id: 'proj-del-1',
            user_email: 'lead@artlake.studio',
            user_id: 'admin-lead-id',
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-surv-1',
            project_id: 'proj-survivor-2',
            user_email: 'lead@artlake.studio',
            user_id: 'admin-lead-id',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      mockSupabase.testUtils.setMockUser({
        id: 'admin-lead-id',
        email: 'lead@artlake.studio',
        role: 'admin',
        full_name: 'Studio Lead Admin',
      });
    });

    it('4.1 Deleting currently active project auto-switches to another accessible project and updates localStorage', async () => {
      // Set active project in localStorage to proj-del-1
      window.localStorage.setItem('artlake_active_project_id', 'proj-del-1');

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-del-1');
      });

      // Admin deletes the active project
      let deleteResult: any = null;
      await act(async () => {
        deleteResult = await hookContext?.deleteProject('proj-del-1');
      });

      expect(deleteResult).not.toBeNull();
      expect(deleteResult.error).toBeNull();

      // currentProject auto-switched to surviving project
      await waitFor(() => {
        expect(hookContext?.currentProject?.id).toBe('proj-survivor-2');
      });

      expect(hookContext?.currentProject?.name).toBe('Surviving Project');
      expect(hookContext?.userProjects.length).toBe(1);
      expect(hookContext?.userProjects[0].id).toBe('proj-survivor-2');

      // LocalStorage updated to surviving project
      expect(window.localStorage.getItem('artlake_active_project_id')).toBe('proj-survivor-2');
    });

    it('4.2 Deleting non-active project keeps current active project unchanged', async () => {
      window.localStorage.setItem('artlake_active_project_id', 'proj-survivor-2');

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-survivor-2');
      });

      // Delete the other project
      let deleteResult: any = null;
      await act(async () => {
        deleteResult = await hookContext?.deleteProject('proj-del-1');
      });

      expect(deleteResult.error).toBeNull();

      // Current active remains proj-survivor-2
      expect(hookContext?.currentProject?.id).toBe('proj-survivor-2');
      expect(hookContext?.userProjects.length).toBe(1);
    });

    it('4.3 Deleting the only remaining project results in null currentProject gracefully without crashing', async () => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-single',
            name: 'Single Project',
            description: '',
            created_by: 'admin-lead-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-single-1',
            project_id: 'proj-single',
            user_email: 'lead@artlake.studio',
            user_id: 'admin-lead-id',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-single');
      });

      // Delete proj-single (the only project)
      let deleteResult: any = null;
      await act(async () => {
        deleteResult = await hookContext?.deleteProject('proj-single');
      });

      expect(deleteResult.error).toBeNull();

      await waitFor(() => {
        expect(hookContext?.currentProject).toBeNull();
      });

      expect(hookContext?.userProjects.length).toBe(0);
      expect(hookContext?.members.length).toBe(0);
    });
  });

  // ==========================================================================
  // VECTOR 5: INPUT BOUNDARY & VALIDATION HARDENING
  // ==========================================================================
  describe('Vector 5: Input Boundary & Member Invitation Validation', () => {
    beforeEach(() => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-boundary',
            name: 'Boundary Test Studio',
            description: '',
            created_by: 'admin-lead-id',
            created_at: new Date().toISOString(),
          },
        ],
      });

      mockSupabase.testUtils.setMockUser({
        id: 'admin-lead-id',
        email: 'lead@artlake.studio',
        role: 'admin',
      });
    });

    it('5.1 Rejects empty or invalid emails when inviting members', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-boundary');
      });

      const invalidEmails = ['', '   ', 'not-an-email', 'missingatsign.com'];

      for (const email of invalidEmails) {
        let result: any = null;
        await act(async () => {
          result = await hookContext?.inviteMember('proj-boundary', email);
        });

        expect(result.data).toBeNull();
        expect(result.error).not.toBeNull();
        expect(result.error.message).toMatch(/Invalid email/i);
      }
    });

    it('5.2 Trims and normalizes valid email invitation to lowercase', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('hook-current-project-id')).toHaveTextContent('proj-boundary');
      });

      let result: any = null;
      await act(async () => {
        result = await hookContext?.inviteMember('proj-boundary', '   UPPERCASE.Member@ArtLake.Studio   ');
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data.userEmail).toBe('uppercase.member@artlake.studio');

      const snapshot = mockSupabase.testUtils.getSnapshot();
      const invited = snapshot.project_members.find((pm) => pm.user_email === 'uppercase.member@artlake.studio');
      expect(invited).toBeDefined();
    });
  });
});
