import React, { useState, useRef, useEffect } from 'react';
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
  const { isAdmin, currentProject, userProjects, selectProject } = useProject();
  const { isManualModalOpen, closeManualModal, toastMessage } = useTimer();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const isCompact = activeView === 'kanban' || activeView === 'gantt';

  return (
    <>
      <header
        data-testid="topbar"
        className="topbar sticky top-0 z-50 h-16 h-[56px] md:h-16 md:h-[64px] bg-[rgba(11,10,18,0.88)] backdrop-blur-[16px] border-b border-border-subtle flex items-center justify-between px-3.5 md:px-6 gap-2 md:gap-3.5 select-none"
      >
        {/* ================= ZONE 1: BRAND + PROJECT SELECTOR + NAVIGATION PILL ================= */}
        <div data-testid="topbar-zone-1" className="topbar-left flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* ArtLake Studio Logo & Name */}
          <div className="brand flex items-center gap-2 font-semibold text-[14.5px] tracking-[-0.01em] text-text-primary pr-0.5 md:pr-1.5">
            <div className="brand-logo w-7 h-7 min-w-[28px] min-h-[28px] rounded-lg bg-gradient-to-br from-accent-primary to-accent-hover flex items-center justify-center font-bold text-sm text-white shadow-[0_4px_12px_rgba(124,92,255,0.35)]">
              A
            </div>
            <span className="hidden xl:inline">ArtLake Studio</span>
          </div>

          {/* Project Selector Dropdown Pill (Desktop/Tablet) */}
          <div className="hidden md:block">
            <ProjectSelector />
          </div>

          {/* Segmented Navigation Pill (Moves to Fixed Bottom Bar on Mobile) */}
          <NavigationPill activeView={activeView} onViewChange={onViewChange} />
        </div>

        {/* ================= ZONE 2: SMART ADAPTIVE TIMER PILL ================= */}
        <div data-testid="topbar-zone-2" className="flex items-center justify-center">
          <TimerPill isCompact={isCompact} />
        </div>

        {/* ================= ZONE 3: ACTIONS, PROFILE & LOGOUT ================= */}
        <div data-testid="topbar-zone-3" className="topbar-right flex items-center gap-1.5 md:gap-2.5 relative flex-shrink-0">
          {/* Role Switcher (Desktop/Tablet) */}
          {isAdmin && onRoleViewChange && (
            <div
              data-testid="role-switch"
              className="role-switch hidden md:flex items-center bg-white/[0.03] border border-border-subtle rounded-pill p-0.5 text-[11.5px]"
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
              title={weeklyCheckPending ? 'Check settimanale in attesa' : 'Check settimanale completato'}
              className={`check-pill flex items-center justify-center gap-1.5 rounded-full md:rounded-pill text-xs font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 whitespace-nowrap min-w-[36px] min-h-[36px] p-0 md:px-3 md:py-1.5 ${
                weeklyCheckPending
                  ? 'bg-amber-soft text-[#fbbf24] border border-amber/35'
                  : 'bg-emerald-soft text-[#34d399] border border-emerald/30'
              }`}
            >
              <span>{weeklyCheckPending ? '⚠️' : '✓'}</span>
              <span className="hidden md:inline">Check</span>
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              data-testid="notif-bell-btn"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              aria-label="Notifiche"
              className="icon-btn w-[35px] h-[35px] min-w-[35px] min-h-[35px] rounded-full bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle hover:border-white/15 text-text-secondary hover:text-text-primary flex items-center justify-center cursor-pointer transition-colors relative"
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

          {/* User Profile Avatar with Responsive Dropdown Menu */}
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              data-testid="user-profile"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="user-profile flex items-center gap-2 p-1 pr-1 md:pr-2.5 rounded-pill hover:bg-white/[0.03] border border-transparent hover:border-border-subtle transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
            >
              <div className="avatar accent w-[29px] h-[29px] min-w-[29px] min-h-[29px] rounded-full bg-accent-primary/25 border border-accent-primary/45 text-[#cabdff] text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
                {user?.initials || 'U'}
              </div>
              <span data-testid="user-profile-name" className="user-name text-[12.5px] font-medium text-text-primary hidden xl:inline">
                {user?.fullName || 'Studio Member'}
              </span>
            </button>

            {/* Profile Dropdown Menu (Desktop & Mobile) */}
            {isProfileMenuOpen && (
              <div
                data-testid="profile-dropdown-menu"
                className="absolute top-12 right-0 w-[calc(100vw-32px)] max-w-[280px] bg-bg-surface border border-white/12 rounded-2xl p-3 shadow-popover z-50 flex flex-col gap-2.5 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* Profile Identity */}
                <div className="flex flex-col border-b border-border-subtle pb-2 px-1">
                  <span className="text-xs font-semibold text-text-primary">
                    {user?.fullName || 'Studio Member'}
                  </span>
                  <span className="text-[11px] text-text-muted truncate">
                    {user?.email || 'member@artlake.studio'}
                  </span>
                </div>

                {/* Mobile: Project Switcher */}
                <div className="md:hidden flex flex-col gap-1 border-b border-border-subtle pb-2">
                  <span className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wider px-1">
                    Progetto Attivo
                  </span>
                  <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                    {userProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`mobile-project-option-${p.id}`}
                        onClick={() => {
                          selectProject(p.id);
                          setIsProfileMenuOpen(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          p.id === currentProject?.id
                            ? 'bg-accent-soft text-[#c8bcff]'
                            : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {p.id === currentProject?.id && <span className="text-accent-primary text-[11px]">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile: Role Switcher */}
                {isAdmin && onRoleViewChange && (
                  <div className="md:hidden flex flex-col gap-1 border-b border-border-subtle pb-2">
                    <span className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wider px-1">
                      Vista Ruolo
                    </span>
                    <div className="flex gap-1 bg-white/[0.03] border border-border-subtle rounded-lg p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          onRoleViewChange('user');
                          setIsProfileMenuOpen(false);
                        }}
                        className={`flex-1 py-1 rounded-md font-semibold text-center transition-colors ${
                          activeRoleView === 'user' ? 'bg-bg-elevated text-text-primary' : 'text-text-muted'
                        }`}
                      >
                        User
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRoleViewChange('admin');
                          setIsProfileMenuOpen(false);
                        }}
                        className={`flex-1 py-1 rounded-md font-semibold text-center transition-colors ${
                          activeRoleView === 'admin' ? 'bg-bg-elevated text-text-primary' : 'text-text-muted'
                        }`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                )}

                {/* Logout Button */}
                <button
                  type="button"
                  data-testid="profile-menu-logout-btn"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-rose hover:bg-rose-soft/40 transition-colors cursor-pointer"
                >
                  <span>Esci</span>
                  <span>🚪</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Standalone Logout Button */}
          <button
            type="button"
            data-testid="topbar-logout-btn"
            onClick={() => logout()}
            className="text-xs px-2.5 py-1 rounded-pill bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle hover:border-rose/30 hover:text-rose text-text-secondary transition-colors cursor-pointer hidden md:inline-flex"
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
