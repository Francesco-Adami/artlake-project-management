import React from 'react';
import { NavigationTab } from '../../types/models';

export interface NavigationPillProps {
  activeView: NavigationTab;
  onViewChange: (view: NavigationTab) => void;
}

export const NavigationPill: React.FC<NavigationPillProps> = ({ activeView, onViewChange }) => {
  const tabs: Array<{ id: NavigationTab; label: string; icon: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'kanban', label: 'Kanban', icon: '📋' },
    { id: 'gantt', label: 'Gantt', icon: '📅' },
  ];

  return (
    <nav
      data-testid="nav-segmented"
      aria-label="Navigazione principale"
      className="nav-segmented flex items-center fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto justify-around bg-[rgba(19,17,28,0.92)] backdrop-blur-[16px] border border-border-subtle p-1.5 rounded-pill shadow-popover pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] md:static md:bottom-auto md:left-auto md:right-auto md:z-auto md:max-w-none md:mx-0 md:bg-bg-surface md:p-[3px] md:shadow-none md:justify-start md:pb-[3px] gap-[2px]"
    >
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            data-testid={`nav-pill-${tab.id}`}
            onClick={() => onViewChange(tab.id)}
            className={`nav-pill-btn flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 md:py-1 min-h-[40px] md:min-h-0 rounded-pill text-[12.5px] font-medium transition-all duration-150 cursor-pointer ${
              isActive
                ? 'active bg-accent-soft text-[#c8bcff] font-semibold shadow-[inset_0_0_0_1px_rgba(124,92,255,0.35)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
