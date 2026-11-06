import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/App';
import { mockSupabase } from '../../src/services/mockSupabase';

describe('Milestone 2: Auth Gate, Whitelist & Multi-Project Isolation (R1 & R2)', () => {
  beforeEach(() => {
    mockSupabase.testUtils.resetDatabase();
    window.localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // R1: Pre-Auth Gate & Whitelist
  // --------------------------------------------------------------------------
  it('AC1: Utente non autenticato accede unicamente al LoginGate con zero dati esposti', async () => {
    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('login-gate')).toBeInTheDocument();
    });

    expect(screen.getByTestId('google-login-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace-shell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unauthorized-screen')).not.toBeInTheDocument();
  });

  it('AC2: Utente autenticato non presente in project_members e non admin riceve UnauthorizedScreen con testo verbatim', async () => {
    mockSupabase.testUtils.setMockUser({
      id: 'unauthorized-user-id',
      email: 'outsider@gmail.com',
      role: 'user',
      full_name: 'External Person',
    });

    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('unauthorized-screen')).toBeInTheDocument();
    });

    const msg = screen.getByTestId('unauthorized-message');
    expect(msg).toHaveTextContent(
      "Account non autorizzato. Chiedi all'amministratore di invitarti a un progetto"
    );
    expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace-shell')).not.toBeInTheDocument();
  });

  it('AC3: Logout da UnauthorizedScreen riporta a LoginGate', async () => {
    mockSupabase.testUtils.setMockUser({
      id: 'unauthorized-user-id',
      email: 'outsider@gmail.com',
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
  });

  it('AC4: Utente autenticato presente in project_members accede al workspace autorizzato', async () => {
    mockSupabase.testUtils.seedDatabase({
      projects: [
        {
          id: 'proj-alpha',
          name: 'Project Alpha',
          description: 'Core game project',
          created_by: 'admin-id',
          created_at: new Date().toISOString(),
        },
      ],
      project_members: [
        {
          id: 'pm-1',
          project_id: 'proj-alpha',
          user_email: 'dev@artlake.studio',
          user_id: 'dev-user-id',
          invited_at: new Date().toISOString(),
        },
      ],
    });

    mockSupabase.testUtils.setMockUser({
      id: 'dev-user-id',
      email: 'dev@artlake.studio',
      role: 'user',
      full_name: 'Developer Member',
    });

    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('Project Alpha');
    });

    expect(screen.getByTestId('user-role-badge')).toHaveTextContent('Membro');
  });

  it('AC5: Utente con ruolo admin accede sempre anche prima della creazione di progetti', async () => {
    mockSupabase.testUtils.setMockUser({
      id: 'admin-id-1',
      email: 'producer@artlake.studio',
      role: 'admin',
      full_name: 'Studio Producer',
    });

    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('user-role-badge')).toHaveTextContent('Admin');
  });

  // --------------------------------------------------------------------------
  // R2: Multi-Project Engine & Permissions
  // --------------------------------------------------------------------------
  it('AC6: Admin può creare un nuovo progetto e invitare membri', async () => {
    mockSupabase.testUtils.setMockUser({
      id: 'admin-id-1',
      email: 'lead@artlake.studio',
      role: 'admin',
      full_name: 'Tech Lead Admin',
    });

    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
    });

    // Open admin management panel
    const toggleAdmin = screen.getByTestId('toggle-admin-panel');
    await userEvent.click(toggleAdmin);

    // Create Project
    const nameInput = screen.getByTestId('new-project-input');
    await userEvent.type(nameInput, 'Nebula VR');
    const createBtn = screen.getByTestId('create-project-btn');
    await userEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('Nebula VR');
    });

    // Invite Member
    const inviteInput = screen.getByTestId('invite-email-input');
    await userEvent.type(inviteInput, 'artist@artlake.studio');
    const inviteBtn = screen.getByTestId('invite-btn');
    await userEvent.click(inviteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('members-list')).toHaveTextContent('artist@artlake.studio');
    });
  });

  it('AC7: Utente con ruolo user non vede pannello admin e le mutation admin sono respinte da RLS', async () => {
    mockSupabase.testUtils.seedDatabase({
      projects: [
        {
          id: 'proj-1',
          name: 'Studio Project 1',
          description: '',
          created_by: 'admin-id',
          created_at: new Date().toISOString(),
        },
      ],
      project_members: [
        {
          id: 'pm-1',
          project_id: 'proj-1',
          user_email: 'regular.dev@artlake.studio',
          user_id: 'user-id-reg',
          invited_at: new Date().toISOString(),
        },
      ],
    });

    mockSupabase.testUtils.setMockUser({
      id: 'user-id-reg',
      email: 'regular.dev@artlake.studio',
      role: 'user',
    });

    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('Studio Project 1');
    });

    // Admin panel toggle is NOT present for regular users
    expect(screen.queryByTestId('toggle-admin-panel')).not.toBeInTheDocument();

    // Direct database insertion on projects by non-admin is rejected
    const { error: insertError } = await mockSupabase.from('projects').insert({
      name: 'Hacked Project',
      created_by: 'user-id-reg',
    });
    expect(insertError).not.toBeNull();
    expect(insertError?.code).toBe('42501');
  });

  it('AC8: Isolamento multi-progetto: un utente visualizza ESCLUSIVAMENTE i progetti assegnati', async () => {
    mockSupabase.testUtils.seedDatabase({
      projects: [
        {
          id: 'proj-allowed',
          name: 'Progetto Consentito',
          description: '',
          created_by: 'admin-id',
          created_at: new Date().toISOString(),
        },
        {
          id: 'proj-forbidden',
          name: 'Progetto Segreto Non Invitato',
          description: '',
          created_by: 'admin-id',
          created_at: new Date().toISOString(),
        },
      ],
      project_members: [
        {
          id: 'pm-allow',
          project_id: 'proj-allowed',
          user_email: 'member@artlake.studio',
          user_id: 'member-user-id',
          invited_at: new Date().toISOString(),
        },
      ],
    });

    mockSupabase.testUtils.setMockUser({
      id: 'member-user-id',
      email: 'member@artlake.studio',
      role: 'user',
    });

    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('project-selector')).toHaveTextContent('Progetto Consentito');
    });

    // Selector only has Progetto Consentito
    const selector = screen.getByTestId('project-selector');
    expect(selector).not.toHaveTextContent('Progetto Segreto Non Invitato');

    // Database query directly verifies RLS filter
    const { data: accessibleProjects } = await mockSupabase.from('projects').select('*');
    expect(accessibleProjects?.length).toBe(1);
    expect(accessibleProjects?.[0].id).toBe('proj-allowed');
  });

  it('AC9: Auto-binding degli inviti pendenti al primo login dell account Google', async () => {
    // 1. Admin invites an email that has never logged in yet (user_id is null)
    mockSupabase.testUtils.seedDatabase({
      projects: [
        {
          id: 'proj-main',
          name: 'Main Game',
          description: '',
          created_by: 'admin-id',
          created_at: new Date().toISOString(),
        },
      ],
      project_members: [
        {
          id: 'pm-pending',
          project_id: 'proj-main',
          user_email: 'newhire@artlake.studio',
          user_id: null,
          invited_at: new Date().toISOString(),
        },
      ],
    });

    // 2. New user logs in with that email
    mockSupabase.testUtils.setMockUser({
      id: 'newhire-uid-99',
      email: 'newhire@artlake.studio',
      role: 'user',
      full_name: 'New Hire',
    });

    // 3. Auto-binding trigger links user_id
    const snapshot = mockSupabase.testUtils.getSnapshot();
    const boundMember = snapshot.project_members.find((pm) => pm.user_email === 'newhire@artlake.studio');
    expect(boundMember?.user_id).toBe('newhire-uid-99');

    // 4. User is authorized and enters workspace
    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('Main Game');
    });
  });

  it('AC10: Selezione del progetto attivo persiste su localStorage e aggiorna il contesto', async () => {
    mockSupabase.testUtils.seedDatabase({
      projects: [
        {
          id: 'proj-1',
          name: 'Progetto 1',
          description: '',
          created_by: 'admin-id',
          created_at: new Date().toISOString(),
        },
        {
          id: 'proj-2',
          name: 'Progetto 2',
          description: '',
          created_by: 'admin-id',
          created_at: new Date().toISOString(),
        },
      ],
      project_members: [
        {
          id: 'pm-1',
          project_id: 'proj-1',
          user_email: 'poly@artlake.studio',
          user_id: 'poly-id',
          invited_at: new Date().toISOString(),
        },
        {
          id: 'pm-2',
          project_id: 'proj-2',
          user_email: 'poly@artlake.studio',
          user_id: 'poly-id',
          invited_at: new Date().toISOString(),
        },
      ],
    });

    mockSupabase.testUtils.setMockUser({
      id: 'poly-id',
      email: 'poly@artlake.studio',
      role: 'user',
    });

    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('Progetto 1');
    });

    const selector = screen.getByTestId('project-selector');
    await userEvent.selectOptions(selector, 'proj-2');

    await waitFor(() => {
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('Progetto 2');
    });

    expect(window.localStorage.getItem('artlake_active_project_id')).toBe('proj-2');
  });

  it('AC11: Isolamento operativo: query su task di un progetto non autorizzato restituiscono 0 record', async () => {
    mockSupabase.testUtils.seedDatabase({
      projects: [
        {
          id: 'proj-secret',
          name: 'Secret Project',
          description: '',
          created_by: 'admin-id',
          created_at: new Date().toISOString(),
        },
      ],
      tasks: [
        {
          id: 'task-confidential',
          project_id: 'proj-secret',
          title: 'Classified gameplay task',
          description: '',
          status: 'in_progress',
          priority: 'high',
          department_tag: '#CoreGameplay',
          assignee_id: 'admin-id',
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

    // Non-member logs in
    mockSupabase.testUtils.setMockUser({
      id: 'non-member-id',
      email: 'uninvited@artlake.studio',
      role: 'user',
    });

    // Query on tasks
    const { data: tasks } = await mockSupabase.from('tasks').select('*');
    expect(tasks).toEqual([]);
  });

  it('AC12: Logout dalla TopBar disconnette la sessione e ritorna a LoginGate', async () => {
    mockSupabase.testUtils.seedDatabase({
      projects: [
        {
          id: 'proj-1',
          name: 'ArtLake Core',
          description: '',
          created_by: 'admin-id',
          created_at: new Date().toISOString(),
        },
      ],
      project_members: [
        {
          id: 'pm-1',
          project_id: 'proj-1',
          user_email: 'user@artlake.studio',
          user_id: 'user-id',
          invited_at: new Date().toISOString(),
        },
      ],
    });

    mockSupabase.testUtils.setMockUser({
      id: 'user-id',
      email: 'user@artlake.studio',
      role: 'user',
    });

    render(React.createElement(App));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
      expect(screen.getByTestId('active-project-name')).toHaveTextContent('ArtLake Core');
    });

    const logoutBtn = screen.getByTestId('header-logout-btn');
    await userEvent.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByTestId('login-gate')).toBeInTheDocument();
    });
  });
});
