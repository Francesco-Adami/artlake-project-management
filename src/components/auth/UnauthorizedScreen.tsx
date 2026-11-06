import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export interface UnauthorizedScreenProps {
  userEmail?: string | null;
}

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({ userEmail }) => {
  const { logout, isLoading } = useAuth();

  return (
    <div
      data-testid="unauthorized-screen"
      className="min-h-screen w-full flex items-center justify-center p-4 bg-bg-base relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(244, 63, 94, 0.10) 0%, transparent 60%)',
      }}
    >
      <div className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-2xl p-8 sm:p-10 shadow-card flex flex-col items-center text-center relative z-10 backdrop-blur-md">
        {/* Warning Icon Badge */}
        <div className="w-12 h-12 rounded-xl bg-amber-soft border border-amber/30 text-amber flex items-center justify-center mb-5 text-xl font-bold shadow-[0_4px_16px_rgba(245,158,11,0.2)]">
          ⚠️
        </div>

        {/* Header */}
        <h1 className="text-xl font-bold tracking-tight text-text-primary mb-2">
          Accesso Limitato
        </h1>

        {/* Verbatim Mandatory Copy (Req R1) */}
        <p data-testid="unauthorized-message" className="text-sm text-text-secondary leading-relaxed mb-4">
          Account non autorizzato. Chiedi all'amministratore di invitarti a un progetto
        </p>

        {/* Email Pill Badge */}
        {userEmail && (
          <div
            data-testid="unauthorized-email"
            className="mb-6 px-3 py-1 rounded-full bg-bg-elevated border border-border-subtle text-xs text-text-muted font-mono"
          >
            {userEmail}
          </div>
        )}

        <div className="w-full h-px bg-border-divider mb-6" />

        {/* Single Logout CTA */}
        <button
          data-testid="logout-btn"
          onClick={() => logout()}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-text-primary bg-bg-elevated hover:bg-bg-surface-hover border border-border-subtle hover:border-rose/40 hover:text-rose transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          Esci dall'account (Logout)
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedScreen;
