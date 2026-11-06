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
      className="nav-segmented flex items-center bg-bg-surface border border-border-subtle p-[3px] rounded-pill gap-[2px]"
    >
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            data-testid={`nav-pill-${tab.id}`}
            onClick={() => onViewChange(tab.id)}
            className={`nav-pill-btn flex items-center gap-1.5 px-3 py-1 rounded-pill text-[12.5px] font-medium transition-all duration-150 cursor-pointer ${
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
