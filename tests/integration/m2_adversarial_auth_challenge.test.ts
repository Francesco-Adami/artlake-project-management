import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/App';
import { mockSupabase } from '../../src/services/mockSupabase';

describe('Milestone 2 Adversarial Challenge: Auth Gate, Whitelist & Session Lifecycle', () => {
  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Category A: Unauthenticated Access & Gate Invariance
  // ==========================================================================
  describe('Category A: Unauthenticated Access & Zero-Knowledge Pre-Auth Gate', () => {
    it('CHALLENGE A1: Mounting App with session === null renders exclusively LoginGate', async () => {
      mockSupabase.testUtils.setSession(null);

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('login-gate')).toBeInTheDocument();
      });

      expect(screen.getByTestId('google-login-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('workspace-shell')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unauthorized-screen')).not.toBeInTheDocument();
    });

    it('CHALLENGE A2: Zero project, task, or team data is exposed in DOM for unauthenticated users', async () => {
      // Seed database with sensitive studio projects and tasks
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-secret-1',
            name: 'Confidential Unannounced Title',
            description: 'Highly confidential studio roadmap',
            created_by: 'admin-owner',
            created_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 'task-nda',
            project_id: 'proj-secret-1',
            title: 'Top Secret Gameplay Feature',
            description: 'NDA protected',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#CoreGameplay',
            assignee_id: 'admin-owner',
            queue_order: 1,
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
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('login-gate')).toBeInTheDocument();
      });

      const bodyText = document.body.textContent || '';
      expect(bodyText).not.toContain('Confidential Unannounced Title');
      expect(bodyText).not.toContain('Top Secret Gameplay Feature');
      expect(bodyText).not.toContain('proj-secret-1');
    });

    it('CHALLENGE A3: Direct anonymous queries to all tables return empty sets (Zero Anon Access)', async () => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'p-1',
            name: 'Alpha',
            description: '',
            created_by: 'adm',
            created_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 't-1',
            project_id: 'p-1',
            title: 'Task 1',
            description: '',
            status: 'not_started',
            priority: 'medium',
            department_tag: '#Core',
            assignee_id: null,
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
        project_members: [
          {
            id: 'pm-1',
            project_id: 'p-1',
            user_email: 'lead@artlake.studio',
            user_id: 'lead-id',
            invited_at: new Date().toISOString(),
          },
        ],
        profiles: [
          {
            id: 'lead-id',
            email: 'lead@artlake.studio',
            full_name: 'Lead Developer',
            initials: 'LD',
            avatar_url: null,
            role: 'user',
            department: 'Core',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
      });

      // Explicitly unauthenticated
      mockSupabase.testUtils.setSession(null);

      const { data: projects } = await mockSupabase.from('projects').select('*');
      expect(projects).toEqual([]);

      const { data: tasks } = await mockSupabase.from('tasks').select('*');
      expect(tasks).toEqual([]);

      const { data: members } = await mockSupabase.from('project_members').select('*');
      expect(members).toEqual([]);

      const { data: profiles } = await mockSupabase.from('profiles').select('*');
      expect(profiles).toEqual([]);
    });

    it('CHALLENGE A4: Anonymous insert mutation is rejected with RLS 42501 error', async () => {
      mockSupabase.testUtils.setSession(null);

      const { data, error } = await mockSupabase.from('projects').insert({
        name: 'Hacked Anonymous Project',
        created_by: 'anon-attacker',
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('CHALLENGE A5: Google OAuth sign-in button triggers signInWithOAuth and transitions session', async () => {
      mockSupabase.testUtils.setSession(null);

      const signInSpy = vi.spyOn(mockSupabase.auth, 'signInWithOAuth');

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('login-gate')).toBeInTheDocument();
      });

      const googleBtn = screen.getByTestId('google-login-btn');
      await userEvent.click(googleBtn);

      expect(signInSpy).toHaveBeenCalledWith({
        provider: 'google',
        options: { queryParams: undefined },
      });
    });
  });

  // ==========================================================================
  // Category B: Arbitrary Uninvited Google Logins & Query Suppression
  // ==========================================================================
  describe('Category B: Arbitrary Uninvited Google Logins & Query Suppression', () => {
    it('CHALLENGE B1: Arbitrary uninvited Google user is quarantined at UnauthorizedScreen', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'external-intruder-id',
        email: 'intruder@external-domain.com',
        role: 'user',
        full_name: 'External Intruder',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('workspace-shell')).not.toBeInTheDocument();
      expect(screen.queryByTestId('project-selector')).not.toBeInTheDocument();
    });

    it('CHALLENGE B2: UnauthorizedScreen displays exact verbatim copy and shows user email badge', async () => {
      const email = 'random.visitor@gmail.com';
      mockSupabase.testUtils.setMockUser({
        id: 'visitor-uid',
        email,
        role: 'user',
        full_name: 'Random Visitor',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
      });

      const messageElem = screen.getByTestId('unauthorized-message');
      expect(messageElem.textContent?.trim()).toBe(
        "Account non autorizzato. Chiedi all'amministratore di invitarti a un progetto"
      );

      const emailBadge = screen.getByTestId('unauthorized-email');
      expect(emailBadge).toHaveTextContent(email);
    });

    it('CHALLENGE B3: UnauthorizedScreen offers only a single Logout CTA and zero project navigation', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'uninvited-guest',
        email: 'guest@unknown.com',
        role: 'user',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(1);
      expect(buttons[0]).toHaveAttribute('data-testid', 'logout-btn');
      expect(buttons[0]).toHaveTextContent("Esci dall'account (Logout)");
    });

    it('CHALLENGE B4: Workspace queries are suppressed and direct queries return empty for unauthorized account', async () => {
      // Seed project owned by studio
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-internal-ops',
            name: 'Studio Internal Ops',
            description: '',
            created_by: 'admin-owner',
            created_at: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 't-ops-1',
            project_id: 'proj-internal-ops',
            title: 'Audit Financials',
            description: '',
            status: 'in_progress',
            priority: 'high',
            department_tag: '#Management',
            assignee_id: 'admin-owner',
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
        id: 'unauthorized-prying-eyes',
        email: 'prying.eyes@outsider.net',
        role: 'user',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
      });

      // Direct query attempt by unauthorized user
      const { data: projects } = await mockSupabase.from('projects').select('*');
      expect(projects).toEqual([]);

      const { data: tasks } = await mockSupabase.from('tasks').select('*');
      expect(tasks).toEqual([]);

      const { data: members } = await mockSupabase.from('project_members').select('*');
      expect(members).toEqual([]);
    });

    it('CHALLENGE B5: Forging user_metadata.role = "admin" on client without profile admin role is denied by database RLS', async () => {
      // User with spoofed user_metadata role but database profile role === 'user'
      mockSupabase.testUtils.seedDatabase({
        profiles: [
          {
            id: 'forger-uid',
            email: 'forger@artlake.studio',
            full_name: 'Forger Hacker',
            initials: 'FH',
            avatar_url: null,
            role: 'user', // DB role is strictly 'user'
            department: 'Core',
            active_task_id: null,
            created_at: new Date().toISOString(),
          },
        ],
      });

      mockSupabase.testUtils.setMockUser({
        id: 'forger-uid',
        email: 'forger@artlake.studio',
        role: 'user', // user_metadata role
      });

      // Attempt admin operation (creating project) directly via client
      const { data, error } = await mockSupabase.from('projects').insert({
        name: 'Unauthorized Spoofed Project',
        created_by: 'forger-uid',
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('CHALLENGE B6: Revocation or deletion of only assigned project relegates member to UnauthorizedScreen', async () => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-doomed',
            name: 'Doomed Project',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-doomed',
            project_id: 'proj-doomed',
            user_email: 'member@artlake.studio',
            user_id: 'member-uid',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      mockSupabase.testUtils.setMockUser({
        id: 'member-uid',
        email: 'member@artlake.studio',
        role: 'user',
        full_name: 'Doomed Member',
      });

      const { unmount } = render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      });

      unmount();

      // Admin deletes the doomed project (simulating cascade delete of members)
      mockSupabase.testUtils.setMockUser({
        id: 'admin-id',
        email: 'admin@artlake.studio',
        role: 'admin',
      });
      await mockSupabase.from('projects').delete().eq('id', 'proj-doomed');

      // User re-evaluates session / re-opens app
      mockSupabase.testUtils.setMockUser({
        id: 'member-uid',
        email: 'member@artlake.studio',
        role: 'user',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('workspace-shell')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Category C: Case-Insensitive Email Whitelisting
  // ==========================================================================
  describe('Category C: Case-Insensitive Email Whitelisting & Normalization', () => {
    it('CHALLENGE C1: Lowercase invite + UPPERCASE login authorizes successfully', async () => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-case-1',
            name: 'Case Test Project 1',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-case-1',
            project_id: 'proj-case-1',
            user_email: 'senior.engineer@artlake.studio',
            user_id: null,
            invited_at: new Date().toISOString(),
          },
        ],
      });

      // User logs in with uppercase email
      mockSupabase.testUtils.setMockUser({
        id: 'senior-eng-uid',
        email: 'SENIOR.ENGINEER@ARTLAKE.STUDIO',
        role: 'user',
        full_name: 'Senior Engineer',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
        expect(screen.getByTestId('active-project-name')).toHaveTextContent('Case Test Project 1');
      });
    });

    it('CHALLENGE C2: MixedCase invite in database + lowercase login authorizes successfully', async () => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-case-2',
            name: 'Case Test Project 2',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-case-2',
            project_id: 'proj-case-2',
            user_email: 'TEST.USER@ArtLake.Studio',
            user_id: null,
            invited_at: new Date().toISOString(),
          },
        ],
      });

      // User logs in with lowercase email
      mockSupabase.testUtils.setMockUser({
        id: 'user-case-2-uid',
        email: 'test.user@artlake.studio',
        role: 'user',
        full_name: 'Test User',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
        expect(screen.getByTestId('active-project-name')).toHaveTextContent('Case Test Project 2');
      });
    });

    it('CHALLENGE C3: Arbitrary mixed casing variations match case-insensitively', async () => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-case-3',
            name: 'Case Test Project 3',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-case-3',
            project_id: 'proj-case-3',
            user_email: 'Lead.Technical.Artist@ArtLake.Studio',
            user_id: null,
            invited_at: new Date().toISOString(),
          },
        ],
      });

      // User logs in with wild alternating casing
      mockSupabase.testUtils.setMockUser({
        id: 'tech-art-uid',
        email: 'lEaD.tEcHnIcAl.aRtIsT@aRtLaKe.sTuDiO',
        role: 'user',
        full_name: 'Tech Artist',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
        expect(screen.getByTestId('active-project-name')).toHaveTextContent('Case Test Project 3');
      });
    });

    it('CHALLENGE C4: Subtle typo or mismatch is strictly denied authorization', async () => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-secure',
            name: 'Fortified Project',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-secure',
            project_id: 'proj-secure',
            user_email: 'verified.user@artlake.studio',
            user_id: null,
            invited_at: new Date().toISOString(),
          },
        ],
      });

      // Attempt login with similar but wrong email (typo / domain typo)
      mockSupabase.testUtils.setMockUser({
        id: 'typo-uid',
        email: 'verified.user@artlake.org', // .org instead of .studio
        role: 'user',
        full_name: 'Verified Imposter',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('workspace-shell')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Category D: Logout Cleanup, State Invalidation & Multi-Session Transitions
  // ==========================================================================
  describe('Category D: Logout Cleanup, State Invalidation & Multi-Session Transitions', () => {
    it('CHALLENGE D1: Workspace header logout resets session, user state, and displays LoginGate', async () => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-cleanup',
            name: 'Cleanup Workspace',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-cleanup',
            project_id: 'proj-cleanup',
            user_email: 'clean.dev@artlake.studio',
            user_id: 'clean-uid',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      mockSupabase.testUtils.setMockUser({
        id: 'clean-uid',
        email: 'clean.dev@artlake.studio',
        role: 'user',
        full_name: 'Clean Dev',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      });

      // Trigger logout
      const logoutBtn = screen.getByTestId('header-logout-btn');
      await userEvent.click(logoutBtn);

      await waitFor(() => {
        expect(screen.getByTestId('login-gate')).toBeInTheDocument();
      });

      // Supabase session must be null
      const { data: sessionData } = await mockSupabase.auth.getSession();
      expect(sessionData.session).toBeNull();

      // Subsequent query must yield empty
      const { data: projects } = await mockSupabase.from('projects').select('*');
      expect(projects).toEqual([]);
    });

    it('CHALLENGE D2: Unauthorized screen logout purges session and redirects to LoginGate', async () => {
      mockSupabase.testUtils.setMockUser({
        id: 'visitor-id-99',
        email: 'uninvited.guest@gmail.com',
        role: 'user',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
      });

      const logoutBtn = screen.getByTestId('logout-btn');
      await userEvent.click(logoutBtn);

      await waitFor(() => {
        expect(screen.getByTestId('login-gate')).toBeInTheDocument();
      });

      const { data: sessionData } = await mockSupabase.auth.getSession();
      expect(sessionData.session).toBeNull();
    });

    it('CHALLENGE D3: Consecutive logins (authorized -> logout -> unauthorized) preserve strict isolation', async () => {
      // 1. Seed project with member
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-multi-session',
            name: 'Multi Session Sandbox',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-allowed',
            project_id: 'proj-multi-session',
            user_email: 'authorized.user@artlake.studio',
            user_id: 'auth-uid-1',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      // First login: Authorized User
      mockSupabase.testUtils.setMockUser({
        id: 'auth-uid-1',
        email: 'authorized.user@artlake.studio',
        role: 'user',
        full_name: 'Authorized User',
      });

      const { unmount } = render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
        expect(screen.getByTestId('active-project-name')).toHaveTextContent('Multi Session Sandbox');
      });

      // User logs out
      const logoutBtn = screen.getByTestId('header-logout-btn');
      await userEvent.click(logoutBtn);

      await waitFor(() => {
        expect(screen.getByTestId('login-gate')).toBeInTheDocument();
      });

      unmount();

      // Second login: Unauthorized User
      mockSupabase.testUtils.setMockUser({
        id: 'intruder-uid-2',
        email: 'intruder.user@external.com',
        role: 'user',
        full_name: 'Intruder User',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('workspace-shell')).not.toBeInTheDocument();
      expect(document.body.textContent).not.toContain('Multi Session Sandbox');
    });

    it('CHALLENGE D4: LocalStorage active project is not leaked to a second user without project access', async () => {
      mockSupabase.testUtils.seedDatabase({
        projects: [
          {
            id: 'proj-user-a',
            name: 'User A Secret Project',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
          {
            id: 'proj-user-b',
            name: 'User B Safe Project',
            description: '',
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
          },
        ],
        project_members: [
          {
            id: 'pm-a',
            project_id: 'proj-user-a',
            user_email: 'usera@artlake.studio',
            user_id: 'uid-a',
            invited_at: new Date().toISOString(),
          },
          {
            id: 'pm-b',
            project_id: 'proj-user-b',
            user_email: 'userb@artlake.studio',
            user_id: 'uid-b',
            invited_at: new Date().toISOString(),
          },
        ],
      });

      // User A selects Proj A, which stores 'proj-user-a' in localStorage
      window.localStorage.setItem('artlake_active_project_id', 'proj-user-a');

      // Now User B logs in (has access only to 'proj-user-b')
      mockSupabase.testUtils.setMockUser({
        id: 'uid-b',
        email: 'userb@artlake.studio',
        role: 'user',
        full_name: 'User B',
      });

      render(React.createElement(App));

      await waitFor(() => {
        expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
        // Must NOT show Proj A
        expect(screen.getByTestId('active-project-name')).toHaveTextContent('User B Safe Project');
      });

      expect(screen.getByTestId('project-selector')).not.toHaveTextContent('User A Secret Project');

      // LocalStorage is corrected to Proj B
      expect(window.localStorage.getItem('artlake_active_project_id')).toBe('proj-user-b');
    });
  });
});
