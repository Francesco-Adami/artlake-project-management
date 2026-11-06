import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { TaskStatus, TaskStatusLabel, TASK_STATUS_TO_LABEL } from '../../types/models';

const KANBAN_STATUSES: { status: TaskStatus; label: TaskStatusLabel }[] = [
  { status: 'not_started', label: 'Non iniziata' },
  { status: 'in_progress', label: 'In corso' },
  { status: 'blocked', label: 'Bloccato' },
  { status: 'in_review', label: 'In revisione' },
  { status: 'completed', label: 'Completata' },
];

export const KanbanBoard: React.FC = () => {
  const { user } = useAuth();
  const { allKanbanTasks, changeStatus } = useTasks();
  const [filterMineOnly, setFilterMineOnly] = useState<boolean>(false);
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

  const getNextStatus = (current: TaskStatus): TaskStatus => {
    const cycle: TaskStatus[] = ['not_started', 'in_progress', 'in_review', 'completed'];
    const idx = cycle.indexOf(current);
    if (idx === -1) return 'in_progress';
    return cycle[(idx + 1) % cycle.length];
  };

  const handleQuickMove = async (taskId: string, title: string, currentStatus: TaskStatus) => {
    const next = getNextStatus(currentStatus);
    await changeStatus(taskId, next);
    showToast(`"${title}" spostata in ${TASK_STATUS_TO_LABEL[next]}`);
  };

  const filteredTasks = allKanbanTasks.filter((task) => {
    if (filterMineOnly && user) {
      return task.assigneeId === user.id;
    }
    return true;
  });

  return (
    <div data-testid="kanban-view" className="workspace-full w-full max-w-[1400px] mx-auto px-6 py-6 pb-16 flex flex-col">
      {/* Toast */}
      {toastMessage && (
        <div
          data-testid="kanban-toast"
          className="fixed bottom-6 right-6 z-50 bg-[#1d192b] border border-accent-primary/40 text-text-primary px-4 py-2.5 rounded-pill shadow-popover text-xs font-semibold animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      {/* Toolbar */}
      <div className="view-toolbar flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="view-toolbar-left">
          <h2 className="text-xl font-bold tracking-[-0.02em] text-text-primary">Vista Kanban</h2>
          <p className="text-[13px] text-text-secondary">
            Sfrutta tutta la larghezza dello schermo senza sidebar. Il timer in alto si è compattato automaticamente.
          </p>
        </div>

        <div className="view-toolbar-right flex items-center gap-2">
          <div className="role-switch flex items-center bg-white/[0.03] border border-border-subtle rounded-pill p-0.5 text-[11.5px]">
            <button
              id="kanbanFilterAll"
              data-testid="kanban-filter-all"
              type="button"
              onClick={() => setFilterMineOnly(false)}
              className={`role-btn px-2.5 py-1 rounded-pill font-semibold cursor-pointer transition-all ${
                !filterMineOnly
                  ? 'bg-bg-elevated text-text-primary shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Tutto il Team
            </button>
            <button
              id="kanbanFilterMine"
              data-testid="kanban-filter-mine"
              type="button"
              onClick={() => setFilterMineOnly(true)}
              className={`role-btn px-2.5 py-1 rounded-pill font-semibold cursor-pointer transition-all ${
                filterMineOnly
                  ? 'bg-bg-elevated text-text-primary shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Solo {user?.fullName || 'Me'}
            </button>
          </div>
        </div>
      </div>

      {/* Kanban 5 Columns */}
      <div
        id="kanbanBoard"
        data-testid="kanban-board"
        className="kanban-board grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4"
      >
        {KANBAN_STATUSES.map(({ status, label }) => {
          const colTasks = filteredTasks.filter((t) => t.status === status);

          return (
            <div
              key={status}
              data-testid={`kanban-col-${status}`}
              className="kanban-col bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col gap-3 min-h-[540px]"
            >
              <div className="kanban-col-header flex items-center justify-between pb-2.5 border-b border-border-divider">
                <span className="kanban-col-title text-[13px] font-semibold text-text-primary">
                  {label}
                </span>
                <span className="kanban-count text-[11px] bg-white/[0.06] text-text-secondary px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {colTasks.map((task) => {
                  const nextStatus = getNextStatus(task.status);
                  const nextLabel = TASK_STATUS_TO_LABEL[nextStatus];

                  return (
                    <div
                      key={task.id}
                      data-testid={`kanban-card-${task.id}`}
                      className="k-card bg-bg-elevated border border-border-subtle rounded-xl p-3.5 flex flex-col gap-2.5 transition-all hover:border-accent-primary/40 hover:-translate-y-0.5"
                    >
                      <div className="flex justify-between items-center">
                        <span className="k-dept text-[10.5px] font-semibold text-[#b7a6ff] bg-accent-soft px-2 py-0.5 rounded">
                          {task.departmentTag}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '3gg'}
                        </span>
                      </div>

                      <div className="k-title text-[13.5px] font-semibold text-text-primary leading-[1.35]">
                        {task.title}
                      </div>

                      {task.blockingTarget && (
                        <div className="text-[11.5px] text-[#fbbf24]">
                          ⚠️ Bloccante per {task.blockingTarget}
                        </div>
                      )}
                      {task.status === 'blocked' && task.blockerReason && (
                        <div className="text-[11.5px] text-[#fda4af]">
                          ⛔ {task.blockerReason}
                        </div>
                      )}

                      <div className="k-meta flex items-center justify-between text-[11.5px] text-text-muted pt-2 border-t border-border-divider">
                        <span>👤 {task.assigneeId ? 'Assegnata' : 'Orfana'}</span>
                        <button
                          type="button"
                          data-testid={`kanban-move-${task.id}`}
                          onClick={() => handleQuickMove(task.id, task.title, task.status)}
                          className="k-move-btn bg-white/5 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-primary text-[11px] px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                        >
                          → {nextLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-xs text-text-muted">
                    Nessuna task
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
