import React, { useState, useRef, useEffect } from 'react';
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

  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsStatsOpen(false);
      }
    };
    if (isStatsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatsOpen]);

  return (
    <div
      ref={popoverRef}
      data-testid="timer-pill"
      className={`topbar-center relative flex items-center gap-2 md:gap-[11px] bg-bg-surface border border-border-subtle px-2 md:px-[6px] md:pl-[13px] py-1 rounded-pill shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-250 ${
        isRunning ? 'running border-accent-primary/45 shadow-[0_0_22px_rgba(124,92,255,0.16)]' : ''
      } ${isCompact ? 'compact' : ''}`}
    >
      {/* Status Dot: Amber when paused, emerald pulsing when running */}
      <span
        data-testid="timer-status-dot"
        title={isRunning ? 'Timer Attivo' : 'Timer in Pausa'}
        onClick={() => setIsStatsOpen((prev) => !prev)}
        className={`timer-status-dot w-2 h-2 rounded-full transition-all duration-200 flex-shrink-0 cursor-pointer ${
          isRunning
            ? 'bg-emerald shadow-[0_0_0_4px_rgba(16,185,129,0.22)] animate-pulse'
            : 'bg-amber shadow-[0_0_0_3px_rgba(245,158,11,0.15)]'
        }`}
      />

      {/* Monospace Counter (Tap opens stats & manual edit popover on mobile) */}
      <button
        type="button"
        data-testid="timer-display"
        onClick={() => setIsStatsOpen((prev) => !prev)}
        title="Dettagli ore e rettifica orario"
        className="timer-display font-mono text-xs sm:text-[14.5px] font-semibold tracking-[0.03em] text-text-primary min-w-[62px] sm:min-w-[74px] text-left hover:text-accent-primary transition-colors cursor-pointer"
      >
        {formattedElapsed}
      </button>

      {/* Active task badge label if available */}
      {activeTaskTitle && (
        <span
          data-testid="timer-task-label"
          title={activeTaskTitle}
          className="text-[11px] text-text-secondary bg-white/[0.04] px-2 py-0.5 rounded-md max-w-[90px] sm:max-w-[110px] truncate hidden sm:inline"
        >
          {activeTaskTitle}
        </span>
      )}

      {/* Manual Rectification Button (✎) - visible on md+ screen */}
      <button
        type="button"
        data-testid="timer-edit-btn"
        onClick={openManualModal}
        title="Rettifica orario manualmente"
        className="timer-edit-btn hidden md:inline-flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/[0.06] text-xs px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
      >
        ✎
      </button>

      {/* Start / Pause Toggle Button */}
      <button
        type="button"
        data-testid="timer-toggle-btn"
        onClick={toggleTimer}
        className={`timer-btn flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 md:py-1 min-h-[36px] md:min-h-0 min-w-[36px] rounded-pill text-xs font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap ${
          isRunning
            ? 'bg-rose-soft text-[#fda4af] border border-rose/35 hover:brightness-110'
            : 'bg-accent-primary hover:bg-accent-hover text-white hover:-translate-y-0.5'
        }`}
      >
        <span data-testid="timer-btn-icon">{isRunning ? '⏸' : '▶'}</span>
        <span data-testid="timer-btn-text" className="hidden md:inline">
          {isRunning ? 'Pausa' : 'Avvia Timer'}
        </span>
      </button>

      {/* Collapsible Weekly Statistics (Auto-collapses in Kanban & Gantt, hidden on < 1150px) */}
      <div
        data-testid="timer-extra-wrap"
        className={`timer-extra-wrap flex items-center gap-2.5 overflow-hidden whitespace-nowrap transition-all duration-280 hidden xl:flex ${
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

      {/* Mobile Stats & Rectification Popover */}
      {isStatsOpen && (
        <div
          data-testid="timer-mobile-popover"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-bg-surface border border-border-subtle rounded-xl p-3 shadow-popover z-50 flex flex-col gap-2.5 backdrop-blur-md"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-text-primary border-b border-border-subtle pb-1.5">
            <span>Riepilogo Ore</span>
            <button
              type="button"
              onClick={() => setIsStatsOpen(false)}
              className="text-text-muted hover:text-text-primary text-sm leading-none"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-1 text-xs text-text-secondary">
            <div className="flex justify-between">
              <span>Settimana corrente:</span>
              <strong className="text-text-primary">{weeklyStats.currentWeekFormatted}</strong>
            </div>
            <div className="flex justify-between">
              <span>Media storica:</span>
              <strong className="text-text-primary">{weeklyStats.historicalAvgFormatted}</strong>
            </div>
          </div>
          <button
            type="button"
            data-testid="timer-popover-edit-btn"
            onClick={() => {
              setIsStatsOpen(false);
              openManualModal();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-bg-elevated hover:bg-bg-surface-hover border border-border-subtle text-xs font-semibold text-accent-primary transition-colors cursor-pointer"
          >
            <span>✎</span>
            <span>Rettifica orario manuale</span>
          </button>
        </div>
      )}
    </div>
  );
};
