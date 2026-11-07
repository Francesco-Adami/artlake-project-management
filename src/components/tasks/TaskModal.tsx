import React, { useState, useEffect } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTasks } from '../../hooks/useTasks';
import { Task, TaskPriority, TaskStatus, DepartmentTag } from '../../types/models';

interface TaskModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialTask?: Task | null;
  onClose: () => void;
}

const DEPARTMENTS: DepartmentTag[] = [
  '#CoreDev',
  '#CoreGameplay',
  '#TechArt',
  '#3DEnv',
  '#Audio',
  '#UI/UX',
  '#VFX',
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  mode,
  initialTask,
  onClose,
}) => {
  const { members } = useProject();
  const { createTask, updateTask } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [departmentTag, setDepartmentTag] = useState<DepartmentTag>('#CoreDev');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [estimate, setEstimate] = useState<number | string>(60);
  const [startDate, setStartDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [blockingTarget, setBlockingTarget] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority || 'medium');
      setDepartmentTag(initialTask.departmentTag || '#CoreDev');
      setAssigneeId(initialTask.assigneeId || '');
      setEstimate(initialTask.estimatedMinutes ?? 0);
      setStartDate(initialTask.startDate ? initialTask.startDate.split('T')[0] : '');
      setDueDate(initialTask.dueDate ? initialTask.dueDate.split('T')[0] : '');
      setBlockingTarget(initialTask.blockingTarget || '');
      setStatus(initialTask.status || 'not_started');
    } else {
      // Create defaults
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDepartmentTag('#CoreDev');
      setAssigneeId('');
      setEstimate(60);
      setStartDate('');
      setDueDate('');
      setBlockingTarget('');
      setStatus('not_started');
    }
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [isOpen, mode, initialTask]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Il titolo della task è obbligatorio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const estMinutes = Number(estimate) || 0;
    const sDate = startDate ? new Date(startDate).toISOString() : null;
    const dDate = dueDate ? new Date(dueDate).toISOString() : null;
    const aId = assigneeId ? assigneeId : null;
    const bTarget = blockingTarget.trim() ? blockingTarget.trim() : null;

    if (mode === 'create') {
      const { error } = await createTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        departmentTag,
        assigneeId: aId,
        estimatedMinutes: estMinutes,
        startDate: sDate,
        dueDate: dDate,
        blockingTarget: bTarget,
        status: 'not_started',
      });

      setIsSubmitting(false);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      onClose();
    } else if (mode === 'edit' && initialTask) {
      const { error } = await updateTask(initialTask.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        departmentTag,
        assigneeId: aId,
        estimatedMinutes: estMinutes,
        startDate: sDate,
        dueDate: dDate,
        blockingTarget: bTarget,
        status,
      });

      setIsSubmitting(false);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="task-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-bg-surface border border-border-subtle rounded-2xl shadow-card overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-divider bg-white/[0.02]">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">
            {mode === 'create' ? '+ Nuova Task' : 'Modifica Task'}
          </h2>
          <button
            type="button"
            data-testid="task-form-cancel-btn"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-xl leading-none px-2 py-1 rounded cursor-pointer transition-colors"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {errorMessage && (
            <div
              data-testid="task-form-error"
              className="p-3 bg-rose-soft/40 border border-rose/50 rounded-xl text-xs font-semibold text-[#fda4af]"
            >
              {errorMessage}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Titolo Task <span className="text-accent-primary">*</span>
            </label>
            <input
              type="text"
              data-testid="task-form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implementare sistema di animazione IK"
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-all"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Descrizione
            </label>
            <textarea
              data-testid="task-form-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Dettagli e requisiti della task..."
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-all resize-none"
            />
          </div>

          {/* Row: Priority & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Priorità
              </label>
              <select
                data-testid="task-form-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-all cursor-pointer"
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Reparto (Department Tag)
              </label>
              <select
                data-testid="task-form-department"
                value={departmentTag}
                onChange={(e) => setDepartmentTag(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-all cursor-pointer"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Assignee & Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Assegnatario
              </label>
              <select
                data-testid="task-form-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-all cursor-pointer"
              >
                <option value="">Nessun Assegnatario</option>
                {members.map((m) => (
                  <option key={m.id} value={m.userId || m.id}>
                    {m.profile?.fullName || m.userEmail}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Stima (minuti)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                data-testid="task-form-estimate"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="60"
                className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-all"
              />
            </div>
          </div>

          {/* Row: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Data Inizio
              </label>
              <input
                type="date"
                data-testid="task-form-start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Data Scadenza
              </label>
              <input
                type="date"
                data-testid="task-form-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-all"
              />
            </div>
          </div>

          {/* Row: Blocking Target & Status (in edit mode) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Dipendenza / Bloccante per
              </label>
              <input
                type="text"
                data-testid="task-form-blocking-target"
                value={blockingTarget}
                onChange={(e) => setBlockingTarget(e.target.value)}
                placeholder="e.g. Audio Team"
                className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-all"
              />
            </div>

            {mode === 'edit' && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Stato
                </label>
                <select
                  data-testid="task-form-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-all cursor-pointer"
                >
                  <option value="not_started">Non iniziata</option>
                  <option value="in_progress">In corso</option>
                  <option value="blocked">Bloccato</option>
                  <option value="in_review">In revisione</option>
                  <option value="completed">Completata</option>
                </select>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-divider">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-xl cursor-pointer transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              data-testid="task-form-submit-btn"
              disabled={isSubmitting}
              className="bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              {isSubmitting
                ? 'Salvataggio...'
                : mode === 'create'
                ? 'Crea Task'
                : 'Salva Modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
