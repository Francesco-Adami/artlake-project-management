import React, { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { Task } from '../../types/models';
import { TaskModal } from '../tasks/TaskModal';

export const GanttView: React.FC = () => {
  const { allKanbanTasks } = useTasks();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const days = [
    '2 Nov', '3 Nov', '4 Nov', '5 Nov (Oggi)', '6 Nov', '7 Nov', '8 Nov',
    '9 Nov', '10 Nov', '11 Nov', '12 Nov', '13 Nov', '14 Nov', '15 Nov',
  ];

  // Map project tasks to 14-day schedule
  const ganttItems = allKanbanTasks.slice(0, 8).map((task, idx) => {
    const startCol = (idx % 7) + 1;
    const spanCols = Math.min(6, Math.max(3, 8 - (idx % 4)));

    let color = 'purple';
    if (task.status === 'blocked') color = 'rose';
    else if (task.status === 'in_review') color = 'amber';
    else if (task.status === 'completed') color = 'emerald';

    return {
      id: task.id,
      title: task.title,
      owner: task.assigneeId ? 'Assegnato' : 'Team',
      start: startCol,
      span: spanCols,
      color,
      label: task.blockingTarget
        ? `⚠️ Sblocca ${task.blockingTarget}`
        : `${Math.round(((task.loggedMinutes || 0) / (task.estimatedMinutes || 60)) * 100)}% · In corso`,
    };
  });

  return (
    <div data-testid="gantt-view" className="workspace-full w-full max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 pb-28 flex flex-col">
      {/* Toolbar */}
      <div className="view-toolbar flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="view-toolbar-left">
          <h2 className="text-xl font-bold tracking-[-0.02em] text-text-primary">
            Vista Gantt — Milestone &amp; Dipendenze
          </h2>
          <p className="text-[13px] text-text-secondary">
            Timeline sprint di ArtLake Studio con evidenza dei colli di bottiglia tra reparti.
          </p>
        </div>

        <div className="view-toolbar-right">
          <span className="due-badge soon bg-rose-soft text-[#fda4af] border border-rose/35 px-3 py-1 rounded-pill text-xs font-semibold">
            Linea Verticale Viola = Oggi (5 Nov)
          </span>
        </div>
      </div>

      {/* Gantt Card */}
      <div
        id="ganttContainer"
        data-testid="gantt-container"
        className="gantt-card bg-bg-surface border border-border-subtle rounded-2xl overflow-x-auto shadow-card"
      >
        <div className="min-w-[960px]">
          {/* Header */}
          <div className="gantt-header grid grid-cols-[290px_repeat(14,minmax(48px,1fr))] border-b border-border-divider bg-white/[0.02] text-[11.5px] font-semibold text-text-muted items-center">
            <div className="gantt-task-cell p-3.5 px-4.5 border-r border-border-divider">
              Task &amp; Assegnatario
            </div>
            {days.map((d, idx) => (
              <div
                key={d}
                className={`gantt-day-cell text-center py-3 px-1 border-r border-white/[0.025] h-full ${
                  idx === 3 ? 'today-col bg-accent-soft/30 text-[#c8bcff]' : ''
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Rows */}
          {ganttItems.map((item) => (
            <div
              key={item.id}
              data-testid={`gantt-row-${item.id}`}
              className="gantt-row grid grid-cols-[290px_repeat(14,minmax(48px,1fr))] border-b border-border-divider items-center hover:bg-white/[0.015] transition-colors"
            >
              <div className="gantt-task-cell p-3.5 px-4.5 border-r border-border-divider flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <strong className="text-[13px] text-text-primary line-clamp-1">{item.title}</strong>
                  <span className="text-[11.5px] text-text-muted">👤 {item.owner}</span>
                </div>
                <button
                  type="button"
                  data-testid={`gantt-edit-${item.id}`}
                  onClick={() => {
                    const task = allKanbanTasks.find((t) => t.id === item.id);
                    if (task) setEditingTask(task);
                  }}
                  className="bg-white/5 border border-border-subtle hover:border-accent-primary text-text-secondary hover:text-text-primary text-[11px] px-2 py-0.5 rounded-md cursor-pointer transition-colors flex-shrink-0"
                >
                  ✎
                </button>
              </div>

              <div className="gantt-timeline-track col-span-14 h-[58px] grid grid-cols-14 items-center px-1 relative">
                <div
                  onClick={() => {
                    const task = allKanbanTasks.find((t) => t.id === item.id);
                    if (task) setEditingTask(task);
                  }}
                  className={`gantt-bar h-[30px] rounded-lg px-3 flex items-center justify-between text-xs font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] whitespace-nowrap overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${
                    item.color === 'purple'
                      ? 'bg-gradient-to-r from-accent-primary to-[#987eff]'
                      : item.color === 'amber'
                      ? 'bg-gradient-to-r from-[#d97706] to-[#f59e0b]'
                      : item.color === 'rose'
                      ? 'bg-gradient-to-r from-[#e11d48] to-[#f43f5e]'
                      : 'bg-gradient-to-r from-[#059669] to-[#10b981]'
                  }`}
                  style={{ gridColumn: `${item.start} / span ${item.span}` }}
                >
                  <span className="truncate">{item.label}</span>
                </div>
              </div>
            </div>
          ))}

          {ganttItems.length === 0 && (
            <div className="text-center py-12 text-xs text-text-muted">
              Nessuna task schedulata nel Gantt.
            </div>
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      <TaskModal
        isOpen={editingTask !== null}
        mode="edit"
        initialTask={editingTask}
        onClose={() => setEditingTask(null)}
      />
    </div>
  );
};
