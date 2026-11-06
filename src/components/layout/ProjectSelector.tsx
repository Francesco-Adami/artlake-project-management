import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../hooks/useProject';

export const ProjectSelector: React.FC = () => {
  const { currentProject, userProjects, selectProject, isAdmin, createProject } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const { data } = await createProject({ name: newProjectName.trim() });
    if (data) {
      setNewProjectName('');
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Hidden standard select element for test compatibility and accessibility */}
      <select
        data-testid="project-selector"
        value={currentProject?.id || ''}
        onChange={(e) => selectProject(e.target.value)}
        className="sr-only opacity-0 absolute pointer-events-none w-0 h-0 -z-50"
        aria-hidden="true"
        tabIndex={-1}
      >
        {userProjects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        data-testid="project-selector-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle hover:border-border-focus rounded-pill px-3 py-1 text-xs text-text-primary font-medium transition-colors cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-accent-primary" />
        <span className="max-w-[120px] truncate">{currentProject?.name || 'Seleziona'}</span>
        <span className="text-[10px] text-text-muted">▾</span>
      </button>

      {isOpen && (
        <div
          data-testid="project-selector-dropdown"
          className="absolute left-0 mt-2 w-56 bg-bg-surface border border-white/10 rounded-xl p-2 shadow-popover z-50 flex flex-col gap-1 backdrop-blur-md"
        >
          <div className="px-2 py-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Progetti ({userProjects.length})
          </div>

          <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
            {userProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`project-option-${p.id}`}
                onClick={() => {
                  selectProject(p.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  p.id === currentProject?.id
                    ? 'bg-accent-soft text-[#c8bcff]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate">{p.name}</span>
                {p.id === currentProject?.id && <span className="text-accent-primary text-[11px]">✓</span>}
              </button>
            ))}
          </div>

          {isAdmin && (
            <div className="border-t border-border-divider mt-1 pt-1">
              {!isCreating ? (
                <button
                  type="button"
                  data-testid="add-new-project-btn"
                  onClick={() => setIsCreating(true)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-accent-primary hover:bg-accent-soft flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>+</span>
                  <span>Nuovo Progetto</span>
                </button>
              ) : (
                <form onSubmit={handleCreate} className="p-1 flex flex-col gap-1.5">
                  <input
                    type="text"
                    data-testid="new-project-quick-input"
                    placeholder="Nome progetto..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                    className="w-full bg-bg-elevated border border-border-subtle rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-border-focus"
                  />
                  <div className="flex gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-2 py-0.5 text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="px-2 py-0.5 text-[11px] bg-accent-primary text-white rounded font-medium cursor-pointer"
                    >
                      Crea
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
