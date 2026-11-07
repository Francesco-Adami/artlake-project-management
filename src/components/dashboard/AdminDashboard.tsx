import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { TaskModal } from '../tasks/TaskModal';

export const AdminDashboard: React.FC = () => {
  const { teamMembersOverview, orphanTasks, assignOrphanTask } = useTasks();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

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

  const handleAssignOrphan = async () => {
    if (orphanTasks.length === 0) {
      showToast('Nessuna task orfana rimasta nel backlog');
      return;
    }
    const targetTask = orphanTasks[0];
    const targetMember = teamMembersOverview[0];
    const success = await assignOrphanTask(targetTask.id, targetMember?.userId);
    if (success) {
      showToast(`Task orfana "${targetTask.title}" assegnata a ${targetMember?.name || 'Membro'}`);
    }
  };

  return (
    <div data-testid="admin-dashboard" className="workspace-full w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6 pb-28 flex flex-col">
      {/* Toast */}
      {toastMessage && (
        <div
          data-testid="admin-toast"
          className="fixed bottom-6 right-6 z-50 bg-[#1d192b] border border-accent-primary/40 text-text-primary px-4 py-2.5 rounded-pill shadow-popover text-xs font-semibold animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      {/* Toolbar */}
      <div className="view-toolbar flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="view-toolbar-left">
          <h2 className="text-xl font-bold tracking-[-0.02em] text-text-primary">
            DashBoard — Admin (Panoramica Team)
          </h2>
          <p className="text-[13px] text-text-secondary">
            Monitoraggio in tempo reale delle Task Principali Attive, blocchi e carico orario settimanale.
          </p>
        </div>

        <div className="view-toolbar-right flex items-center gap-2.5">
          <button
            type="button"
            data-testid="admin-create-task-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-accent-primary hover:bg-accent-hover text-white text-xs font-semibold px-3.5 py-1.5 rounded-pill cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Nuova Task</span>
          </button>
          <button
            id="assignOrphanBtn"
            data-testid="assign-orphan-btn"
            type="button"
            onClick={handleAssignOrphan}
            className="orphan-pill-btn bg-amber-soft text-[#fcd34d] border border-amber/35 px-3.5 py-1.5 rounded-pill text-[12.5px] font-semibold cursor-pointer flex items-center gap-2 hover:bg-amber-soft/80 transition-all"
          >
            <span>⚡</span>
            <span id="orphanCountText" data-testid="orphan-count-text">
              {orphanTasks.length > 0
                ? `${orphanTasks.length} Task Orfane (Non assegnate)`
                : '0 Task Orfane (Tutte assegnate ✓)'}
            </span>
          </button>
        </div>
      </div>

      {/* 3x2 Team Member Grid */}
      <div
        id="adminTeamGrid"
        data-testid="admin-team-grid"
        className="admin-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {teamMembersOverview.map((member) => {
          const isBlocked = member.activeTask?.status === 'blocked';
          const statusColor =
            member.activeTask?.status === 'blocked'
              ? 'rose'
              : member.activeTask?.status === 'in_review'
              ? 'amber'
              : member.activeTask?.status === 'completed'
              ? 'emerald'
              : 'muted';

          return (
            <div
              key={member.userId}
              data-testid={`member-card-${member.userId}`}
              className={`member-card bg-bg-surface border rounded-2xl p-[22px] shadow-card flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:border-white/15 ${
                isBlocked ? 'blocked-alert border-rose/40' : 'border-border-subtle'
              }`}
            >
              {/* Member Top Identity */}
              <div className="member-top flex items-center justify-between">
                <div className="member-identity flex items-center gap-2.5">
                  <div className="avatar w-8 h-8 rounded-full bg-accent-soft text-[#c8bcff] border border-accent-primary/40 flex items-center justify-center font-bold text-xs">
                    {member.initials}
                  </div>
                  <div>
                    <div className="member-name text-[14.5px] font-semibold text-text-primary">
                      {member.name}
                    </div>
                    <div className="member-role text-xs text-text-muted">{member.role}</div>
                  </div>
                </div>

                <span
                  className={`queue-tag text-[11.5px] font-medium px-2 py-0.5 rounded-md ${
                    statusColor === 'rose'
                      ? 'bg-rose-soft text-[#fda4af] border border-rose/30'
                      : statusColor === 'amber'
                      ? 'bg-amber-soft text-[#fcd34d] border border-amber/30'
                      : statusColor === 'emerald'
                      ? 'bg-emerald-soft text-[#6ee7b7] border border-emerald/30'
                      : 'bg-white/5 text-text-secondary border border-border-subtle'
                  }`}
                >
                  {member.activeTask?.statusLabel || 'Inattivo'}
                </span>
              </div>

              {/* Member Active Task Box */}
              <div className="member-active-box bg-white/[0.025] border border-border-subtle rounded-xl p-3.5">
                <div className="member-active-label text-[10.5px] uppercase tracking-[0.06em] text-text-muted mb-1 flex items-center justify-between">
                  <span>Task Attiva</span>
                  <span>{member.weeklyCheckSubmitted ? '✓ Check OK' : '⚠️ Check mancante'}</span>
                </div>
                <div className="member-active-title text-[13.5px] font-semibold text-text-primary mb-2 line-clamp-2">
                  {member.activeTask?.title || 'Nessuna task in lavorazione'}
                </div>
                {member.activeTask?.blockerReason && (
                  <div className="text-xs text-[#fda4af] mt-1">
                    ⛔ {member.activeTask.blockerReason}
                  </div>
                )}
              </div>

              {/* Member Footer */}
              <div className="member-footer flex items-center justify-between text-xs text-text-secondary pt-1.5 border-t border-border-divider">
                <span>
                  Task in coda: <strong className="text-text-primary font-semibold">{member.queuedTasksCount}</strong>
                </span>
                <span>
                  Settimana: <strong className="text-text-primary font-semibold">{member.weeklyHoursLogged}h / {member.weeklyHoursEstimated}h</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Create Task Modal */}
      <TaskModal
        isOpen={isCreateModalOpen}
        mode="create"
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
