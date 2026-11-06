import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { TaskStatus, TaskStatusLabel, LABEL_TO_TASK_STATUS } from '../../types/models';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    activeHeroViewModel,
    queuedCards,
    changeStatus,
    toggleSubtask,
    addSubtask,
    addComment,
    promoteToActiveTask,
    isLoading,
  } = useTasks();

  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [statusContextInput, setStatusContextInput] = useState('');
  const [showStatusContext, setShowStatusContext] = useState(false);
  const [contextType, setContextType] = useState<'blocker' | 'review'>('blocker');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2800);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeHeroViewModel) {
      if (activeHeroViewModel.task.status === 'blocked') {
        setContextType('blocker');
        setStatusContextInput(activeHeroViewModel.task.blockerReason || '');
        setShowStatusContext(true);
      } else if (activeHeroViewModel.task.status === 'in_review') {
        setContextType('review');
        setStatusContextInput(activeHeroViewModel.task.reviewOutputLink || '');
        setShowStatusContext(true);
      } else {
        setShowStatusContext(false);
      }
    }
  }, [activeHeroViewModel?.task.id, activeHeroViewModel?.task.status]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLabel = e.target.value as TaskStatusLabel;
    const newStatus = LABEL_TO_TASK_STATUS[newLabel] as TaskStatus;

    if (!activeHeroViewModel) return;

    if (newStatus === 'blocked') {
      setContextType('blocker');
      setShowStatusContext(true);
      setStatusContextInput(activeHeroViewModel.task.blockerReason || '');
    } else if (newStatus === 'in_review') {
      setContextType('review');
      setShowStatusContext(true);
      setStatusContextInput(activeHeroViewModel.task.reviewOutputLink || '');
    } else {
      setShowStatusContext(false);
      showToast(`Stato aggiornato a "${newLabel}"`);
    }

    await changeStatus(activeHeroViewModel.task.id, newStatus);
  };

  const handleSaveStatusContext = async () => {
    if (!statusContextInput.trim() || !activeHeroViewModel) {
      showToast('Inserisci un dettaglio prima di salvare');
      return;
    }

    if (contextType === 'blocker') {
      await changeStatus(activeHeroViewModel.task.id, 'blocked', {
        blockerReason: statusContextInput.trim(),
      });
      showToast('Notifica di blocco registrata');
    } else {
      await changeStatus(activeHeroViewModel.task.id, 'in_review', {
        reviewLink: statusContextInput.trim(),
      });
      showToast('Link di revisione registrato');
    }
    setShowStatusContext(false);
  };

  const handleAddSubtaskSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSubtaskText.trim() && activeHeroViewModel) {
      await addSubtask(activeHeroViewModel.task.id, newSubtaskText.trim());
      setNewSubtaskText('');
      showToast('Sub-task aggiunto');
    }
  };

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeHeroViewModel) return;
    await addComment(activeHeroViewModel.task.id, commentText.trim());
    setCommentText('');
    showToast('Commento inviato');
  };

  const handlePromote = async (taskId: string, title: string) => {
    await promoteToActiveTask(taskId);
    showToast(`"${title}" promossa a Task Principale`);
  };

  if (isLoading && !activeHeroViewModel) {
    return (
      <div data-testid="user-dashboard-loading" className="flex items-center justify-center p-12">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div
      data-testid="user-dashboard"
      className="workspace-user w-full max-w-[1340px] mx-auto px-6 py-7 pb-16 grid grid-cols-1 lg:grid-cols-[minmax(0,2.35fr)_minmax(310px,1fr)] gap-[26px] items-start"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          data-testid="dashboard-toast"
          className="fixed bottom-6 right-6 z-50 bg-[#1d192b] border border-accent-primary/40 text-text-primary px-4 py-2.5 rounded-pill shadow-popover text-xs font-semibold animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      {/* ================= LEFT COLUMN (70%): HERO ACTIVE TASK ================= */}
      {activeHeroViewModel ? (
        <section
          data-testid="hero-card"
          className="hero-card bg-bg-surface border border-border-subtle rounded-2xl shadow-card p-[30px_34px] flex flex-col"
        >
          {/* Eyebrow Row */}
          <div className="hero-eyebrow-row flex items-center justify-between gap-3 mb-2.5">
            <div className="eyebrow text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted flex items-center gap-2 before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-accent-primary">
              Task Principale Attiva
            </div>

            {/* Status Select Wrapper */}
            <div className="status-select-wrapper relative">
              <select
                id="taskStatusSelect"
                data-testid="task-status-select"
                data-status={activeHeroViewModel.statusLabel}
                value={activeHeroViewModel.statusLabel}
                onChange={handleStatusChange}
                className={`status-select appearance-none rounded-pill px-3.5 pr-8 py-1.5 text-[12.5px] font-semibold cursor-pointer outline-none transition-all ${
                  activeHeroViewModel.task.status === 'blocked'
                    ? 'bg-rose-soft text-[#fda4af] border border-rose/40'
                    : activeHeroViewModel.task.status === 'in_review'
                    ? 'bg-amber-soft text-[#fcd34d] border border-amber/40'
                    : activeHeroViewModel.task.status === 'completed'
                    ? 'bg-emerald-soft text-[#6ee7b7] border border-emerald/40'
                    : activeHeroViewModel.task.status === 'not_started'
                    ? 'bg-white/5 text-text-secondary border border-border-subtle'
                    : 'bg-accent-soft text-[#c8bcff] border border-accent-primary/40'
                }`}
              >
                <option value="Non iniziata">Non iniziata</option>
                <option value="In corso">In corso</option>
                <option value="Bloccato">Bloccato</option>
                <option value="In revisione">In revisione</option>
                <option value="Completata">Completata</option>
              </select>
              <span className="status-chevron absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-text-muted">
                ▾
              </span>
            </div>
          </div>

          {/* Hero Title */}
          <h1
            id="activeTaskTitle"
            data-testid="active-task-title"
            className="hero-title text-2xl font-bold tracking-[-0.02em] text-text-primary mb-5 leading-[1.3]"
          >
            {activeHeroViewModel.task.title}
          </h1>

          {/* Dynamic Context Bar */}
          {showStatusContext && (
            <div
              id="statusContextBar"
              data-testid="status-context-bar"
              className={`status-context-bar flex items-center gap-2.5 mb-5 p-3 rounded-xl border ${
                contextType === 'blocker'
                  ? 'bg-rose-soft/40 border-rose/30'
                  : 'bg-amber-soft/40 border-amber/30'
              }`}
            >
              <span id="statusContextIcon" className="text-base">
                {contextType === 'blocker' ? '⛔' : '🔗'}
              </span>
              <input
                id="statusContextInput"
                data-testid="status-context-input"
                type="text"
                value={statusContextInput}
                onChange={(e) => setStatusContextInput(e.target.value)}
                placeholder={
                  contextType === 'blocker'
                    ? 'Specifica cosa ti blocca (es. In attesa mesh grotta dal team 3D)...'
                    : 'Incolla link alla Pull Request o branch...'
                }
                className="flex-1 bg-black/30 border border-border-subtle text-text-primary px-3 py-1.5 rounded-lg text-[13px] outline-none"
              />
              <button
                id="statusContextSaveBtn"
                data-testid="status-context-save-btn"
                onClick={handleSaveStatusContext}
                className="small-action-btn bg-accent-primary hover:bg-accent-hover text-white rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold cursor-pointer"
              >
                Salva
              </button>
            </div>
          )}

          {/* Time Progress Section */}
          <div className="time-progress-section pb-5 mb-5 border-b border-border-divider">
            <div className="time-meta-row flex items-center justify-between text-[13px] text-text-secondary mb-2.5">
              <div className="time-meta-left flex items-center gap-3">
                <span>
                  Tempo Effettivo:{' '}
                  <strong id="activeTaskSpent" className="text-text-primary font-semibold">
                    {activeHeroViewModel.spentFormatted}
                  </strong>
                </span>
                <span className="text-text-muted">|</span>
                <span>
                  Stima Iniziale:{' '}
                  <strong id="activeTaskEstimate" className="text-text-primary font-semibold">
                    {activeHeroViewModel.estimateFormatted}
                  </strong>
                </span>
              </div>
              <span id="activeTaskPct" className="time-pct text-xs text-text-muted font-medium">
                {activeHeroViewModel.pctTime}% del tempo stimato
              </span>
            </div>
            <div className="progress-track w-full h-[5px] bg-white/[0.06] rounded-full overflow-hidden">
              <div
                id="activeTaskProgressFill"
                data-testid="active-task-progress-fill"
                className="progress-fill h-full bg-gradient-to-r from-accent-primary to-[#a48fff] rounded-full transition-all duration-300"
                style={{ width: `${activeHeroViewModel.pctTime}%` }}
              />
            </div>
          </div>

          {/* Task Description */}
          <p
            id="activeTaskDesc"
            data-testid="active-task-desc"
            className="task-description text-[14.5px] text-text-secondary leading-[1.65] mb-[26px]"
          >
            {activeHeroViewModel.task.description || 'Nessuna descrizione specificata.'}
          </p>

          {/* Operational Checklist (Zero Nested Boxes) */}
          <div className="section-block pt-5 border-t border-border-divider">
            <div className="section-header flex items-center justify-between mb-3">
              <span className="section-title text-[13.5px] font-semibold text-text-primary">
                Checklist Operativa (Sub-task)
              </span>
              <span id="checklistCounter" data-testid="checklist-counter" className="section-counter text-xs text-text-muted font-medium">
                {`${activeHeroViewModel.subtasksCompleted} / ${activeHeroViewModel.subtasksTotal} completati`}
              </span>
            </div>

            <div id="checklistContainer" data-testid="checklist-container" className="checklist flex flex-col gap-0.5">
              {activeHeroViewModel.subtasks.map((item) => (
                <div
                  key={item.id}
                  data-testid={`checklist-item-${item.id}`}
                  onClick={() => toggleSubtask(item.id)}
                  className={`checklist-item flex items-center gap-3 p-2 -mx-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03] select-none ${
                    item.isCompleted ? 'completed' : ''
                  }`}
                >
                  <div
                    data-testid={`checkbox-${item.id}`}
                    className={`custom-checkbox w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center text-[11px] font-bold transition-all ${
                      item.isCompleted
                        ? 'bg-accent-primary border-accent-primary text-white'
                        : 'border-white/20 bg-transparent text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                  <span
                    className={`checklist-text text-sm flex-1 transition-all ${
                      item.isCompleted ? 'line-through text-text-muted' : 'text-text-primary'
                    }`}
                  >
                    {item.title}
                  </span>
                </div>
              ))}
            </div>

            <div className="add-subtask-row flex items-center gap-2.5 mt-2 py-1.5 px-0.5">
              <span className="text-text-muted text-[15px]">+</span>
              <input
                id="newSubtaskInput"
                data-testid="new-subtask-input"
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={handleAddSubtaskSubmit}
                placeholder="Aggiungi un micro-passaggio alla checklist e premi Invio..."
                className="add-subtask-input bg-transparent border-none text-[13px] text-text-secondary outline-none w-full placeholder:text-text-muted focus:text-text-primary"
              />
            </div>
          </div>

          {/* Allegati */}
          <div className="section-block pt-5 border-t border-border-divider mt-5">
            <div className="section-header mb-3">
              <span className="section-label-upper text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Allegati
              </span>
            </div>
            <div className="attachments-row flex flex-wrap gap-2.5">
              {activeHeroViewModel.attachments.length > 0 ? (
                activeHeroViewModel.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.fileUrl || '#'}
                    onClick={(e) => {
                      e.preventDefault();
                      showToast(`Apertura ${att.fileName}`);
                    }}
                    className="attachment-chip inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border-subtle text-text-primary text-[12.5px] font-medium hover:bg-white/[0.06] hover:border-white/15 transition-all"
                  >
                    <span>📄</span>
                    <span>{att.fileName}</span>
                  </a>
                ))
              ) : (
                <div className="text-xs text-text-muted">Nessun allegato caricato.</div>
              )}
            </div>
          </div>

          {/* Commenti alla Task */}
          <div className="section-block pt-5 border-t border-border-divider mt-5">
            <div className="section-header mb-3">
              <span id="commentsHeaderCount" className="section-label-upper text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Commenti alla Task ({activeHeroViewModel.comments.length})
              </span>
            </div>

            <div id="commentsList" data-testid="comments-list" className="comments-list flex flex-col gap-4 my-3.5">
              {activeHeroViewModel.comments.map((c) => {
                const isCurrentUser = c.authorId === user?.id;
                return (
                  <div key={c.id} className="comment-row flex items-start gap-3">
                    <div
                      className={`avatar w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCurrentUser
                          ? 'bg-accent-soft text-[#c8bcff] border border-accent-primary/40'
                          : 'bg-white/10 text-text-secondary'
                      }`}
                    >
                      {isCurrentUser ? user?.initials || 'ME' : 'TM'}
                    </div>
                    <div className="comment-body flex-1 pb-3 border-b border-border-divider last:border-b-0 last:pb-1">
                      <div className="comment-meta flex items-center justify-between mb-1">
                        <span className="comment-author text-[13px] font-semibold text-text-primary">
                          {isCurrentUser ? `${user?.fullName || 'Tu'} (Tu)` : 'Team Member'}
                        </span>
                        <span className="comment-time text-[11.5px] text-text-muted">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="comment-text text-[13.5px] text-text-secondary leading-[1.5]">
                        {c.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              id="commentForm"
              data-testid="comment-form"
              onSubmit={handleAddCommentSubmit}
              className="comment-form flex items-center gap-2.5 bg-black/25 border border-border-subtle rounded-pill p-[5px_6px_5px_16px] mt-4"
            >
              <input
                id="commentInput"
                data-testid="comment-input"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Scrivi una nota o commento alla task..."
                className="comment-input flex-1 bg-transparent border-none text-[13px] text-text-primary outline-none placeholder:text-text-muted"
              />
              <button
                type="submit"
                data-testid="comment-submit-btn"
                className="comment-submit bg-accent-primary hover:bg-accent-hover text-white rounded-pill px-4.5 py-1.5 text-[12.5px] font-semibold cursor-pointer transition-colors"
              >
                Invia
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section
          data-testid="hero-card-empty"
          className="hero-card bg-bg-surface border border-border-subtle rounded-2xl p-8 text-center text-text-muted"
        >
          Nessuna task principale attiva nel progetto. Scegli una task dalla coda a destra.
        </section>
      )}

      {/* ================= RIGHT COLUMN (30%): PROSSIME TASK QUEUE ================= */}
      <aside
        data-testid="queue-column"
        className="queue-column bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-card"
      >
        <div className="queue-header flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-text-primary">Prossime Task</h3>
          <span id="queueCountLabel" data-testid="queue-count-label" className="queue-count text-xs text-text-muted">
            {queuedCards.length} in coda
          </span>
        </div>

        <div id="queueList" data-testid="queue-list" className="queue-list flex flex-col gap-3">
          {queuedCards.map((card) => (
            <div
              key={card.id}
              data-testid={`queue-card-${card.id}`}
              className={`queue-card p-3.5 rounded-xl border border-border-subtle bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-all ${
                card.tagType === 'amber'
                  ? 'blocking-others border-amber/30 bg-gradient-to-b from-amber-soft/20 to-transparent'
                  : ''
              }`}
            >
              <div className="queue-top flex items-start justify-between gap-2.5 mb-2.5">
                <div className="queue-title text-[13.5px] font-semibold text-text-primary leading-[1.35]">
                  {card.title}
                </div>
                <span
                  className={`due-badge text-[11px] font-semibold px-2 py-0.5 rounded-pill whitespace-nowrap ${
                    card.dueUrgent
                      ? 'bg-rose-soft text-[#fda4af] border border-rose/30'
                      : 'bg-white/5 text-text-secondary border border-border-subtle'
                  }`}
                >
                  {card.dueDateFormatted}
                </span>
              </div>

              {card.tagType !== 'none' && card.tagText ? (
                <div
                  className={`queue-tag inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-1 rounded-md mb-2 ${
                    card.tagType === 'amber'
                      ? 'bg-amber-soft text-[#fbbf24] border border-amber/25'
                      : 'bg-rose-soft text-[#fda4af] border border-rose/25'
                  }`}
                >
                  {card.tagText}
                </div>
              ) : (
                <div className="queue-meta-text text-xs text-text-muted mb-2">
                  {card.metaText}
                </div>
              )}

              <div className="queue-footer flex items-center justify-between mt-3 pt-2.5 border-t border-border-divider">
                <span className="text-[11.5px] text-text-muted">Stima: {card.estimatedFormatted}</span>
                <button
                  type="button"
                  data-testid={`promote-btn-${card.id}`}
                  onClick={() => handlePromote(card.id, card.title)}
                  className="promote-btn bg-transparent border-none text-accent-hover hover:text-[#c1b3ff] text-xs font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                >
                  Passa a questa task →
                </button>
              </div>
            </div>
          ))}

          {queuedCards.length === 0 && (
            <div className="text-center py-6 text-xs text-text-muted">
              Nessuna task in coda per questo progetto.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
