import React from 'react';
import { useTimer } from '../../hooks/useTimer';

export interface TimerPillProps {
  isCompact: boolean;
}

export const TimerPill: React.FC<TimerPillProps> = ({ isCompact }) => {
  const {
    isRunning,
    formattedElapsed,
    activeTaskTitle,
    weeklyStats,
    toggleTimer,
    openManualModal,
  } = useTimer();

  return (
    <div
      data-testid="timer-pill"
      className={`topbar-center flex items-center gap-[11px] bg-bg-surface border border-border-subtle px-[6px] pl-[13px] py-1 rounded-pill shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-250 ${
        isRunning ? 'running border-accent-primary/45 shadow-[0_0_22px_rgba(124,92,255,0.16)]' : ''
      } ${isCompact ? 'compact' : ''}`}
    >
      {/* Status Dot: Amber when paused, emerald pulsing when running */}
      <span
        data-testid="timer-status-dot"
        title={isRunning ? 'Timer Attivo' : 'Timer in Pausa'}
        className={`timer-status-dot w-2 h-2 rounded-full transition-all duration-200 flex-shrink-0 ${
          isRunning
            ? 'bg-emerald shadow-[0_0_0_4px_rgba(16,185,129,0.22)] animate-pulse'
            : 'bg-amber shadow-[0_0_0_3px_rgba(245,158,11,0.15)]'
        }`}
      />

      {/* Monospace Counter */}
      <span
        data-testid="timer-display"
        className="timer-display font-mono text-[14.5px] font-semibold tracking-[0.03em] text-text-primary min-w-[74px]"
      >
        {formattedElapsed}
      </span>

      {/* Active task badge label if available */}
      {activeTaskTitle && (
        <span
          data-testid="timer-task-label"
          title={activeTaskTitle}
          className="text-[11px] text-text-secondary bg-white/[0.04] px-2 py-0.5 rounded-md max-w-[110px] truncate hidden sm:inline"
        >
          {activeTaskTitle}
        </span>
      )}

      {/* Manual Rectification Button (✎) */}
      <button
        type="button"
        data-testid="timer-edit-btn"
        onClick={openManualModal}
        title="Rettifica orario manualmente"
        className="timer-edit-btn text-text-muted hover:text-text-primary hover:bg-white/[0.06] text-xs px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
      >
        ✎
      </button>

      {/* Start / Pause Toggle Button */}
      <button
        type="button"
        data-testid="timer-toggle-btn"
        onClick={toggleTimer}
        className={`timer-btn flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap ${
          isRunning
            ? 'bg-rose-soft text-[#fda4af] border border-rose/35 hover:brightness-110'
            : 'bg-accent-primary hover:bg-accent-hover text-white hover:-translate-y-0.5'
        }`}
      >
        <span data-testid="timer-btn-icon">{isRunning ? '⏸' : '▶'}</span>
        <span data-testid="timer-btn-text">{isRunning ? 'Pausa' : 'Avvia Timer'}</span>
      </button>

      {/* Collapsible Weekly Statistics (Auto-collapses in Kanban & Gantt) */}
      <div
        data-testid="timer-extra-wrap"
        className={`timer-extra-wrap flex items-center gap-2.5 overflow-hidden whitespace-nowrap transition-all duration-280 hidden lg:flex ${
          isCompact ? 'max-w-0 opacity-0 -ml-1.5 pointer-events-none' : 'max-w-[260px] opacity-100'
        }`}
      >
        <div className="timer-divider w-px h-4 bg-border-subtle flex-shrink-0" />
        <div className="timer-stats flex items-center gap-2 text-[11.5px] text-text-secondary pr-1.5">
          <span>
            Settimana:{' '}
            <strong data-testid="timer-weekly-hours" className="text-text-primary font-semibold">
              {weeklyStats.currentWeekFormatted}
            </strong>
          </span>
          <span>·</span>
          <span>
            Media:{' '}
            <strong data-testid="timer-avg-hours" className="text-text-primary font-semibold">
              {weeklyStats.historicalAvgFormatted}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
