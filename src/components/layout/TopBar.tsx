import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../hooks/useProject';
import { useTimer } from '../../hooks/useTimer';
import { NavigationTab } from '../../types/models';
import { ProjectSelector } from './ProjectSelector';
import { NavigationPill } from './NavigationPill';
import { TimerPill } from './TimerPill';
import { NotificationsDropdown } from './NotificationsDropdown';
import { ManualTimeModal } from './ManualTimeModal';

export interface TopBarProps {
  activeView: NavigationTab;
  onViewChange: (view: NavigationTab) => void;
  activeRoleView?: 'user' | 'admin';
  onRoleViewChange?: (role: 'user' | 'admin') => void;
  onOpenWeeklyCheck?: () => void;
  weeklyCheckPending?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onViewChange,
  activeRoleView = 'user',
  onRoleViewChange,
  onOpenWeeklyCheck,
  weeklyCheckPending = false,
}) => {
  const { user, logout } = useAuth();
  const { isAdmin } = useProject();
  const { isManualModalOpen, closeManualModal, toastMessage } = useTimer();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const isCompact = activeView === 'kanban' || activeView === 'gantt';

  return (
    <>
      <header
        data-testid="topbar"
        className="topbar sticky top-0 z-50 h-16 h-[64px] bg-[rgba(11,10,18,0.88)] backdrop-blur-[16px] border-b border-border-subtle flex items-center justify-between px-6 gap-3.5 select-none"
      >
        {/* ================= ZONE 1: BRAND + PROJECT SELECTOR + NAVIGATION PILL ================= */}
        <div data-testid="topbar-zone-1" className="topbar-left flex items-center gap-4 flex-shrink-0">
          {/* macOS Window Dots */}
          <div className="window-dots hidden md:flex items-center gap-[7px]">
            <span className="dot red w-[11px] h-[11px] rounded-full bg-[#ff5f56]" />
            <span className="dot yellow w-[11px] h-[11px] rounded-full bg-[#ffbd2e]" />
            <span className="dot green w-[11px] h-[11px] rounded-full bg-[#27c93f]" />
          </div>

          {/* ArtLake Studio Logo & Name */}
          <div className="brand flex items-center gap-2.5 font-semibold text-[14.5px] tracking-[-0.01em] text-text-primary pr-1.5">
            <div className="brand-logo w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-accent-hover flex items-center justify-center font-bold text-sm text-white shadow-[0_4px_12px_rgba(124,92,255,0.35)]">
              A
            </div>
            <span className="hidden sm:inline">ArtLake Studio</span>
          </div>

          {/* Project Selector Dropdown Pill */}
          <ProjectSelector />

          {/* Segmented Navigation Pill */}
          <NavigationPill activeView={activeView} onViewChange={onViewChange} />
        </div>

        {/* ================= ZONE 2: SMART ADAPTIVE TIMER PILL ================= */}
        <div data-testid="topbar-zone-2" className="flex items-center justify-center">
          <TimerPill isCompact={isCompact} />
        </div>

        {/* ================= ZONE 3: ACTIONS, PROFILE & LOGOUT ================= */}
        <div data-testid="topbar-zone-3" className="topbar-right flex items-center gap-2.5 relative flex-shrink-0">
          {/* PWA Direct Desktop Install Button */}
          {deferredPrompt && (
            <button
              type="button"
              data-testid="pwa-install-btn"
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold bg-accent-soft hover:bg-accent-primary/25 border border-accent-primary/45 text-accent-primary transition-all cursor-pointer shadow-sm hover:scale-105 whitespace-nowrap"
              title="Installa ArtLake Studio sul Desktop"
            >
              <span>💻</span>
              <span className="hidden sm:inline">Installa App</span>
            </button>
          )}

          {/* Role Switcher (Visible to Admins / Producers) */}
          {isAdmin && onRoleViewChange && (
            <div
              data-testid="role-switch"
              className="role-switch flex items-center bg-white/[0.03] border border-border-subtle rounded-pill p-0.5 text-[11.5px]"
            >
              <button
                type="button"
                data-testid="role-btn-user"
                onClick={() => onRoleViewChange('user')}
                className={`role-btn px-2.5 py-1 rounded-pill font-semibold transition-all cursor-pointer ${
                  activeRoleView === 'user'
                    ? 'bg-bg-elevated text-text-primary shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                User
              </button>
              <button
                type="button"
                data-testid="role-btn-admin"
                onClick={() => onRoleViewChange('admin')}
                className={`role-btn px-2.5 py-1 rounded-pill font-semibold transition-all cursor-pointer ${
                  activeRoleView === 'admin'
                    ? 'bg-bg-elevated text-text-primary shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Admin
              </button>
            </div>
          )}

          {/* Weekly Check Pill */}
          {onOpenWeeklyCheck && (
            <button
              type="button"
              data-testid="weekly-check-pill"
              onClick={onOpenWeeklyCheck}
              className={`check-pill flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 whitespace-nowrap ${
                weeklyCheckPending
                  ? 'bg-amber-soft text-[#fbbf24] border border-amber/35'
                  : 'bg-emerald-soft text-[#34d399] border border-emerald/30'
              }`}
            >
              <span>{weeklyCheckPending ? '⚠️' : '✓'}</span>
              <span>Check</span>
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              data-testid="notif-bell-btn"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="icon-btn w-[35px] h-[35px] rounded-full bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle hover:border-white/15 text-text-secondary hover:text-text-primary flex items-center justify-center cursor-pointer transition-colors relative"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  data-testid="notif-badge"
                  className="notif-badge absolute -top-0.5 -right-0.5 bg-rose text-white text-[10px] font-bold min-w-[17px] h-[17px] rounded-full flex items-center justify-center px-1 border-2 border-bg-base"
                >
                  {unreadCount}
                </span>
              )}
            </button>

            <NotificationsDropdown
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              onClearAll={() => setUnreadCount(0)}
            />
          </div>

          {/* User Profile Avatar */}
          <div data-testid="user-profile" className="user-profile flex items-center gap-2 p-1 pr-2.5 rounded-pill hover:bg-white/[0.03] border border-transparent hover:border-border-subtle transition-colors cursor-pointer">
            <div className="avatar accent w-[29px] h-[29px] rounded-full bg-accent-primary/25 border border-accent-primary/45 text-[#cabdff] text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
              {user?.initials || 'U'}
            </div>
            <span data-testid="user-profile-name" className="user-name text-[12.5px] font-medium text-text-primary hidden lg:inline">
              {user?.fullName || 'Studio Member'}
            </span>
          </div>

          {/* Logout Buttons */}
          <button
            type="button"
            data-testid="topbar-logout-btn"
            onClick={() => logout()}
            className="text-xs px-2.5 py-1 rounded-pill bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle hover:border-rose/30 hover:text-rose text-text-secondary transition-colors cursor-pointer"
          >
            Esci
          </button>
          <button
            type="button"
            data-testid="header-logout-btn"
            onClick={() => logout()}
            className="sr-only opacity-0 absolute w-0 h-0 pointer-events-none -z-50"
            tabIndex={-1}
            aria-hidden="true"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Manual Time Rectification Modal */}
      {isManualModalOpen && <ManualTimeModal onClose={closeManualModal} />}

      {/* Global Optimistic Toast Box */}
      {toastMessage && (
        <div
          data-testid="toast-box"
          className="fixed bottom-6 right-6 bg-bg-elevated border border-accent-primary/40 text-text-primary px-4 py-2.5 rounded-md text-xs font-medium shadow-popover z-50 animate-bounce"
        >
          {toastMessage}
        </div>
      )}
    </>
  );
};
