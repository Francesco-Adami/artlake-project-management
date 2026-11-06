import React, { useState } from 'react';
import { useProject } from '../../hooks/useProject';
import { NavigationTab } from '../../types/models';
import { TopBar } from '../layout/TopBar';
import { TaskProvider } from '../../context/TaskContext';
import { UserDashboard } from '../dashboard/UserDashboard';
import { AdminDashboard } from '../dashboard/AdminDashboard';
import { KanbanBoard } from '../kanban/KanbanBoard';
import { GanttView } from '../gantt/GanttView';

const WorkspaceShellContent: React.FC = () => {
  const {
    currentProject,
    isAdmin,
    createProject,
    inviteMember,
    members,
  } = useProject();

  const [activeView, setActiveView] = useState<NavigationTab>('dashboard');
  const [activeRoleView, setActiveRoleView] = useState<'user' | 'admin'>('user');
  const [newProjectName, setNewProjectName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const { error } = await createProject({ name: newProjectName.trim() });
    if (error) {
      setFeedbackMsg(`Errore: ${error.message}`);
    } else {
      setNewProjectName('');
      setFeedbackMsg('Progetto creato con successo!');
      setTimeout(() => setFeedbackMsg(''), 3000);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !inviteEmail.trim()) return;
    const { error } = await inviteMember(currentProject.id, inviteEmail.trim());
    if (error) {
      setFeedbackMsg(`Errore: ${error.message}`);
    } else {
      setInviteEmail('');
      setFeedbackMsg('Invito inviato con successo!');
      setTimeout(() => setFeedbackMsg(''), 3000);
    }
  };

  return (
    <div data-testid="workspace-shell" className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      {/* 64px Fixed Top Bar (Zero Sidebar Architecture) */}
      <TopBar
        activeView={activeView}
        onViewChange={setActiveView}
        activeRoleView={activeRoleView}
        onRoleViewChange={setActiveRoleView}
        onOpenWeeklyCheck={() => {}}
        weeklyCheckPending={false}
      />

      {/* Helper test hook */}
      <div data-testid="active-view-container" className="text-xs text-text-muted hidden">
        Active View: {activeView} | Role View: {activeRoleView}
      </div>

      {/* Admin Quick Action Button & Studio Management Section */}
      {isAdmin && (
        <div className="max-w-[1400px] w-full mx-auto px-6 pt-2 flex justify-end">
          <button
            data-testid="toggle-admin-panel"
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="text-xs px-3 py-1.5 rounded-pill bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            {showAdminPanel ? 'Chiudi Gestione' : '⚙️ Gestione Studio'}
          </button>
        </div>
      )}

      {isAdmin && showAdminPanel && (
        <section
          data-testid="admin-panel"
          className="max-w-[1400px] w-full mx-auto my-3 px-6 p-6 rounded-2xl bg-bg-surface border border-border-subtle shadow-card grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Crea Nuovo Progetto</h3>
            <form onSubmit={handleCreateProject} className="flex gap-2">
              <input
                data-testid="new-project-input"
                type="text"
                placeholder="Nome progetto..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="flex-1 bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              />
              <button
                data-testid="create-project-btn"
                type="submit"
                className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-medium cursor-pointer transition-colors"
              >
                Crea
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Invita Membro ({currentProject?.name || 'Seleziona progetto'})
            </h3>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                data-testid="invite-email-input"
                type="email"
                placeholder="email.google@artlake.studio"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              />
              <button
                data-testid="invite-btn"
                type="submit"
                className="px-4 py-2 bg-accent-soft hover:bg-accent-primary/30 text-accent-primary border border-accent-primary/40 rounded-xl text-xs font-medium cursor-pointer transition-colors"
              >
                Invita
              </button>
            </form>
          </div>
          {feedbackMsg && (
            <div className="col-span-full p-2.5 rounded-lg bg-bg-elevated border border-accent-primary/30 text-accent-primary text-xs">
              {feedbackMsg}
            </div>
          )}
        </section>
      )}

      {/* Accessible Project metadata elements for test harness & multi-project verification */}
      <div className="sr-only" aria-hidden="true">
        <span data-testid="active-project-name">{currentProject ? currentProject.name : 'Nessun progetto selezionato'}</span>
        <span data-testid="user-role-badge">{isAdmin ? 'Admin' : 'Membro'}</span>
        <span data-testid="active-project-members-count">{members.length}</span>
        <div data-testid="members-list">
          {members.map((m) => (
            <div key={m.id}>
              <span>{m.userEmail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Operational Workspace Views */}
      <main className="flex-1 w-full">
        {activeView === 'dashboard' && (
          activeRoleView === 'admin' && isAdmin ? <AdminDashboard /> : <UserDashboard />
        )}

        {activeView === 'kanban' && <KanbanBoard />}

        {activeView === 'gantt' && <GanttView />}
      </main>
    </div>
  );
};

export const WorkspaceShell: React.FC = () => {
  return (
    <TaskProvider>
      <WorkspaceShellContent />
    </TaskProvider>
  );
};

export default WorkspaceShell;
