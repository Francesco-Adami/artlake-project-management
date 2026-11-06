import React, { useRef, useEffect } from 'react';

export interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAll: () => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onClose,
  onClearAll,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      data-testid="notif-dropdown"
      className="notif-dropdown absolute top-12 right-0 w-[calc(100vw-24px)] max-w-[360px] bg-bg-surface border border-white/12 rounded-2xl p-4 shadow-popover z-50 flex flex-col gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="notif-header flex items-center justify-between pb-2 border-b border-border-divider">
        <h4 className="text-[13.5px] font-semibold text-text-primary">Notifiche</h4>
        <button
          type="button"
          data-testid="mark-all-read-btn"
          onClick={onClearAll}
          className="mark-read-btn text-xs font-medium text-accent-hover hover:underline cursor-pointer"
        >
          Segna lette
        </button>
      </div>

      <div className="notif-list flex flex-col gap-2 max-h-64 overflow-y-auto">
        <div className="p-2.5 rounded-xl bg-rose-soft/40 border border-rose/30 flex flex-col gap-1">
          <div className="text-xs font-semibold text-[#fda4af]">
            ⏳ Scadenza Imminente (&lt;3gg): 'Setup Audio Mixer &amp; Snapshot URP'
          </div>
          <div className="text-[10.5px] text-text-muted">All'accesso stamattina</div>
        </div>

        <div className="p-2.5 rounded-xl bg-bg-elevated border border-border-subtle flex flex-col gap-1">
          <div className="text-xs text-text-primary">
            💬 Marco Lead ha commentato sulla tua task 'Refactor Pipeline URP'
          </div>
          <div className="text-[10.5px] text-text-muted">Oggi, 11:30</div>
        </div>

        <div className="p-2.5 rounded-xl bg-bg-elevated border border-border-subtle flex flex-col gap-1">
          <div className="text-xs text-text-primary">
            📋 Nuova task assegnata: 'Integrazione Localizzazione Testi UI'
          </div>
          <div className="text-[10.5px] text-text-muted">Ieri</div>
        </div>
      </div>
    </div>
  );
};
