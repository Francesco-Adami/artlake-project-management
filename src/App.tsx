import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { TimerProvider } from './context/TimerContext';
import { LoginGate } from './components/auth/LoginGate';
import { UnauthorizedScreen } from './components/auth/UnauthorizedScreen';
import { WorkspaceShell } from './components/workspace/WorkspaceShell';

export const AppContent: React.FC = () => {
  const { session, isLoading, isAuthorized } = useAuth();

  if (isLoading) {
    return (
      <div
        data-testid="app-loading"
        className="min-h-screen bg-bg-base text-text-primary flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
          <span className="text-xs text-text-secondary">Caricamento workspace...</span>
        </div>
      </div>
    );
  }

  // 1. Pre-Auth Gate: If no active session, present exclusively the Google OAuth login gate
  if (!session) {
    return <LoginGate />;
  }

  // 2. Whitelist Gate: Authenticated Google account not in project_members and non-admin
  if (!isAuthorized) {
    return <UnauthorizedScreen userEmail={session.user?.email} />;
  }

  // 3. Authorized Workspace: Wrap with ProjectProvider and TimerProvider, and render workspace shell
  return (
    <ProjectProvider>
      <TimerProvider>
        <WorkspaceShell />
      </TimerProvider>
    </ProjectProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
