import React, { useState } from 'react';
import { useTimer } from '../../hooks/useTimer';

export interface ManualTimeModalProps {
  onClose: () => void;
}

export const ManualTimeModal: React.FC<ManualTimeModalProps> = ({ onClose }) => {
  const { formattedElapsed, updateManualTime } = useTimer();
  const [timeValue, setTimeValue] = useState(formattedElapsed || '00:00:00');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateManualTime(timeValue.trim());
    if (!result.success) {
      setErrorMessage(result.error || 'Usa il formato HH:MM:SS');
    } else {
      onClose();
    }
  };

  return (
    <div
      data-testid="time-edit-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        data-testid="time-edit-modal"
        className="modal-card bg-bg-surface border border-white/12 rounded-2xl p-6 w-full max-w-[400px] shadow-popover flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="modal-header flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">Rettifica Orario Sessione</h3>
          <button
            type="button"
            data-testid="close-time-modal-btn"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Tempo registrato su task attiva (HH:MM:SS)
            </label>
            <input
              type="text"
              data-testid="manual-time-input"
              value={timeValue}
              onChange={(e) => {
                setTimeValue(e.target.value);
                setErrorMessage('');
              }}
              autoFocus
              className="w-full bg-black/30 border border-border-subtle focus:border-border-focus rounded-lg px-3 py-2 text-sm text-text-primary font-mono outline-none"
            />
            {errorMessage && (
              <span data-testid="manual-time-error" className="text-xs text-rose mt-1 block">
                {errorMessage}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              data-testid="cancel-time-edit-btn"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-white/[0.04] border border-border-subtle cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              data-testid="save-time-edit-btn"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent-primary hover:bg-accent-hover cursor-pointer transition-colors"
            >
              Aggiorna Timer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
