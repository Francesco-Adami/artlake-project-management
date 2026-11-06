import React, {
  createContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { useTimer } from '../hooks/useTimer';
import {
  Task,
  TaskWithDetails,
  Subtask,
  TaskComment,
  TaskAttachment,
  TaskStatus,
  QueuedTaskCard,
  ActiveHeroTaskViewModel,
  TeamMemberOverview,
  TASK_STATUS_TO_LABEL,
  TASK_PRIORITY_TO_LABEL,
} from '../types/models';
import { formatHoursMinutes } from '../utils/timeCalculations';

// ----------------------------------------------------------------------------
// REDUCER STATE & ACTION TYPES
// ----------------------------------------------------------------------------

export interface TaskState {
  tasks: Task[];
  subtasks: Subtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  activeTaskId: string | null;
  isLoading: boolean;
  error: string | null;
}

type TaskAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | {
      type: 'SET_INITIAL_DATA';
      payload: {
        tasks: Task[];
        subtasks: Subtask[];
        comments: TaskComment[];
        attachments: TaskAttachment[];
        activeTaskId: string | null;
      };
    }
  | {
      type: 'OPTIMISTIC_CHANGE_STATUS';
      payload: {
        taskId: string;
        newStatus: TaskStatus;
        blockerReason?: string | null;
        reviewLink?: string | null;
      };
    }
  | {
      type: 'ROLLBACK_CHANGE_STATUS';
      payload: {
        taskId: string;
        previousStatus: TaskStatus;
        previousBlockerReason?: string | null;
        previousReviewLink?: string | null;
      };
    }
  | {
      type: 'OPTIMISTIC_TOGGLE_SUBTASK';
      payload: { subtaskId: string; isCompleted: boolean };
    }
  | {
      type: 'ROLLBACK_TOGGLE_SUBTASK';
      payload: { subtaskId: string; isCompleted: boolean };
    }
  | {
      type: 'OPTIMISTIC_ADD_SUBTASK';
      payload: { subtask: Subtask };
    }
  | {
      type: 'CONFIRM_ADD_SUBTASK';
      payload: { tempId: string; confirmedSubtask: Subtask };
    }
  | {
      type: 'ROLLBACK_ADD_SUBTASK';
      payload: { tempId: string };
    }
  | {
      type: 'OPTIMISTIC_ADD_COMMENT';
      payload: { comment: TaskComment };
    }
  | {
      type: 'CONFIRM_ADD_COMMENT';
      payload: { tempId: string; confirmedComment: TaskComment };
    }
  | {
      type: 'ROLLBACK_ADD_COMMENT';
      payload: { tempId: string };
    }
  | {
      type: 'OPTIMISTIC_PROMOTE_TASK';
      payload: { newActiveTaskId: string };
    }
  | {
      type: 'ROLLBACK_PROMOTE_TASK';
      payload: { previousActiveTaskId: string | null };
    }
  | {
      type: 'OPTIMISTIC_ASSIGN_ORPHAN';
      payload: { taskId: string; assigneeId: string };
    }
  | {
      type: 'ROLLBACK_ASSIGN_ORPHAN';
      payload: { taskId: string; previousAssigneeId: string | null };
    };

const taskReducer = (state: TaskState, action: TaskAction): TaskState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_INITIAL_DATA':
      return {
        ...state,
        tasks: action.payload.tasks,
        subtasks: action.payload.subtasks,
        comments: action.payload.comments,
        attachments: action.payload.attachments,
        activeTaskId: action.payload.activeTaskId,
        isLoading: false,
        error: null,
      };

    case 'OPTIMISTIC_CHANGE_STATUS':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.taskId
            ? {
                ...task,
                status: action.payload.newStatus,
                blockerReason:
                  action.payload.blockerReason !== undefined
                    ? action.payload.blockerReason
                    : task.blockerReason,
                reviewOutputLink:
                  action.payload.reviewLink !== undefined
                    ? action.payload.reviewLink
                    : task.reviewOutputLink,
                updatedAt: new Date().toISOString(),
              }
            : task
        ),
      };

    case 'ROLLBACK_CHANGE_STATUS':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.taskId
            ? {
                ...task,
                status: action.payload.previousStatus,
                blockerReason:
                  action.payload.previousBlockerReason !== undefined
                    ? action.payload.previousBlockerReason
                    : task.blockerReason,
                reviewOutputLink:
                  action.payload.previousReviewLink !== undefined
                    ? action.payload.previousReviewLink
                    : task.reviewOutputLink,
              }
            : task
        ),
      };

    case 'OPTIMISTIC_TOGGLE_SUBTASK':
      return {
        ...state,
        subtasks: state.subtasks.map((sub) =>
          sub.id === action.payload.subtaskId
            ? { ...sub, isCompleted: action.payload.isCompleted }
            : sub
        ),
      };

    case 'ROLLBACK_TOGGLE_SUBTASK':
      return {
        ...state,
        subtasks: state.subtasks.map((sub) =>
          sub.id === action.payload.subtaskId
            ? { ...sub, isCompleted: action.payload.isCompleted }
            : sub
        ),
      };

    case 'OPTIMISTIC_ADD_SUBTASK':
      return {
        ...state,
        subtasks: [...state.subtasks, action.payload.subtask],
      };

    case 'CONFIRM_ADD_SUBTASK':
      return {
        ...state,
        subtasks: state.subtasks.map((sub) =>
          sub.id === action.payload.tempId ? action.payload.confirmedSubtask : sub
        ),
      };

    case 'ROLLBACK_ADD_SUBTASK':
      return {
        ...state,
        subtasks: state.subtasks.filter((sub) => sub.id !== action.payload.tempId),
      };

    case 'OPTIMISTIC_ADD_COMMENT':
      return {
        ...state,
        comments: [...state.comments, action.payload.comment],
      };

    case 'CONFIRM_ADD_COMMENT':
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.payload.tempId ? action.payload.confirmedComment : c
        ),
      };

    case 'ROLLBACK_ADD_COMMENT':
      return {
        ...state,
        comments: state.comments.filter((c) => c.id !== action.payload.tempId),
      };

    case 'OPTIMISTIC_PROMOTE_TASK': {
      const prevActiveId = state.activeTaskId;
      const targetId = action.payload.newActiveTaskId;
      return {
        ...state,
        activeTaskId: targetId,
        tasks: state.tasks.map((t) => {
          if (t.id === targetId) {
            return { ...t, queueOrder: 0 };
          }
          if (t.id === prevActiveId) {
            return { ...t, queueOrder: 1 };
          }
          return t;
        }),
      };
    }

    case 'ROLLBACK_PROMOTE_TASK':
      return {
        ...state,
        activeTaskId: action.payload.previousActiveTaskId,
      };

    case 'OPTIMISTIC_ASSIGN_ORPHAN':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.taskId
            ? { ...t, assigneeId: action.payload.assigneeId, updatedAt: new Date().toISOString() }
            : t
        ),
      };

    case 'ROLLBACK_ASSIGN_ORPHAN':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.taskId
            ? { ...t, assigneeId: action.payload.previousAssigneeId }
            : t
        ),
      };

    default:
      return state;
  }
};

// ----------------------------------------------------------------------------
// CONTEXT INTERFACE
// ----------------------------------------------------------------------------

export interface TaskContextType {
  // Raw Data
  tasks: Task[];
  subtasks: Subtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  activeTaskId: string | null;
  isLoading: boolean;
  error: string | null;

  // Derived View Models
  activeTask: TaskWithDetails | null;
  activeHeroViewModel: ActiveHeroTaskViewModel | null;
  queuedTasks: Task[];
  queuedCards: QueuedTaskCard[];
  orphanTasks: Task[];
  allKanbanTasks: Task[];
  teamMembersOverview: TeamMemberOverview[];

  // Optimistic Operations
  changeStatus: (
    taskId: string,
    newStatus: TaskStatus,
    context?: { blockerReason?: string; reviewLink?: string }
  ) => Promise<boolean>;
  toggleSubtask: (subtaskId: string) => Promise<boolean>;
  addSubtask: (taskId: string, title: string) => Promise<boolean>;
  addComment: (taskId: string, content: string) => Promise<boolean>;
  promoteToActiveTask: (taskId: string) => Promise<boolean>;
  assignOrphanTask: (taskId?: string, assigneeId?: string) => Promise<boolean>;
  refreshTasks: () => Promise<void>;
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined);

// ----------------------------------------------------------------------------
// PROVIDER IMPLEMENTATION
// ----------------------------------------------------------------------------

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentProject, members, isLoadingProjects } = useProject();
  const {
    isRunning: isTimerRunning,
    stopTimer,
    setActiveTask: setTimerActiveTask,
    onTaskStatusChange,
  } = useTimer();

  const [state, dispatch] = useReducer(taskReducer, {
    tasks: [],
    subtasks: [],
    comments: [],
    attachments: [],
    activeTaskId: null,
    isLoading: true,
    error: null,
  });

  // 1. Fetch all project operational data on mount / project change
  const refreshTasks = useCallback(async () => {
    if (isLoadingProjects) {
      dispatch({ type: 'SET_LOADING', payload: true });
      return;
    }

    if (!currentProject) {
      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: { tasks: [], subtasks: [], comments: [], attachments: [], activeTaskId: null },
      });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // A. Query project tasks
      const { data: tasksData, error: tasksErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('queue_order', { ascending: true });

      if (tasksErr || !tasksData) {
        console.error('Error fetching tasks:', tasksErr);
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const tasks: Task[] = tasksData.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        description: row.description || '',
        status: row.status as TaskStatus,
        priority: row.priority as any,
        departmentTag: row.department_tag || '#CoreDev',
        assigneeId: row.assignee_id,
        queueOrder: row.queue_order || 0,
        estimatedMinutes: row.estimated_minutes || 0,
        loggedMinutes: row.logged_minutes || 0,
        dueDate: row.due_date,
        startDate: row.start_date,
        blockerReason: row.blocker_reason,
        blockingTarget: row.blocking_target,
        reviewOutputLink: row.review_output_link,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const taskIds = tasks.map((t) => t.id);

      // B. Query subtasks
      let subtasks: Subtask[] = [];
      if (taskIds.length > 0) {
        const { data: subData } = await supabase
          .from('subtasks')
          .select('*')
          .in('task_id', taskIds)
          .order('position', { ascending: true });

        if (subData) {
          subtasks = subData.map((row) => ({
            id: row.id,
            taskId: row.task_id,
            title: row.title,
            isCompleted: row.is_completed,
            position: row.position,
            createdAt: row.created_at,
          }));
        }
      }

      // C. Query comments
      let comments: TaskComment[] = [];
      if (taskIds.length > 0) {
        const { data: commData } = await supabase
          .from('task_comments')
          .select('*')
          .in('task_id', taskIds)
          .order('created_at', { ascending: true });

        if (commData) {
          comments = commData.map((row) => ({
            id: row.id,
            taskId: row.task_id,
            authorId: row.author_id,
            content: row.content,
            createdAt: row.created_at,
          }));
        }
      }

      // D. Query attachments
      let attachments: TaskAttachment[] = [];
      if (taskIds.length > 0) {
        const { data: attData } = await supabase
          .from('task_attachments')
          .select('*')
          .in('task_id', taskIds)
          .order('created_at', { ascending: true });

        if (attData) {
          attachments = attData.map((row) => ({
            id: row.id,
            taskId: row.task_id,
            uploaderId: row.uploader_id,
            fileName: row.file_name,
            fileUrl: row.file_url,
            fileSize: row.file_size,
            createdAt: row.created_at,
          }));
        }
      }

      // E. Resolve activeTaskId for current user
      let resolvedActiveId: string | null = null;
      if (user) {
        // Preference 1: Explicit activeTaskId on profile if present in project
        if (user.activeTaskId && tasks.some((t) => t.id === user.activeTaskId)) {
          resolvedActiveId = user.activeTaskId;
        } else {
          // Preference 2: User's first task in_progress
          const userTasks = tasks.filter((t) => t.assigneeId === user.id);
          const inProg = userTasks.find((t) => t.status === 'in_progress');
          if (inProg) {
            resolvedActiveId = inProg.id;
          } else if (userTasks.length > 0) {
            // Preference 3: Lowest queue order non-completed
            const notDone = userTasks.filter((t) => t.status !== 'completed');
            resolvedActiveId = notDone.length > 0 ? notDone[0].id : userTasks[0].id;
          } else if (tasks.length > 0) {
            // Fallback: any task in project
            const inProgGlobal = tasks.find((t) => t.status === 'in_progress');
            resolvedActiveId = inProgGlobal ? inProgGlobal.id : tasks[0].id;
          }
        }
      } else if (tasks.length > 0) {
        resolvedActiveId = tasks[0].id;
      }

      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: {
          tasks,
          subtasks,
          comments,
          attachments,
          activeTaskId: resolvedActiveId,
        },
      });
    } catch (err) {
      console.error('Failed to load project tasks:', err);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentProject?.id, user?.id, user?.activeTaskId, isLoadingProjects]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  // --------------------------------------------------------------------------
  // OPTIMISTIC ACTIONS WITH INSTANT UI FEEDBACK & AUTOMATIC ROLLBACK
  // --------------------------------------------------------------------------

  // 1. Status Change (with dynamic blocker / review contexts & timer sync)
  const changeStatus = useCallback(
    async (
      taskId: string,
      newStatus: TaskStatus,
      context?: { blockerReason?: string; reviewLink?: string }
    ): Promise<boolean> => {
      const target = state.tasks.find((t) => t.id === taskId);
      if (!target) return false;

      const previousStatus = target.status;
      const previousBlockerReason = target.blockerReason;
      const previousReviewLink = target.reviewOutputLink;

      // Optimistic 0ms update
      dispatch({
        type: 'OPTIMISTIC_CHANGE_STATUS',
        payload: {
          taskId,
          newStatus,
          blockerReason: context?.blockerReason,
          reviewLink: context?.reviewLink,
        },
      });

      // Synchronize timer automations if active task
      if (taskId === state.activeTaskId) {
        await onTaskStatusChange(taskId, newStatus);
      }

      try {
        const updatePayload: any = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
        if (context?.blockerReason !== undefined) {
          updatePayload.blocker_reason = context.blockerReason;
        }
        if (context?.reviewLink !== undefined) {
          updatePayload.review_output_link = context.reviewLink;
        }

        const { error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Status change failed, rolling back:', err);
        dispatch({
          type: 'ROLLBACK_CHANGE_STATUS',
          payload: {
            taskId,
            previousStatus,
            previousBlockerReason,
            previousReviewLink,
          },
        });
        return false;
      }
    },
    [state.tasks, state.activeTaskId, onTaskStatusChange]
  );

  // 2. Subtask Checkbox Toggle
  const toggleSubtask = useCallback(
    async (subtaskId: string): Promise<boolean> => {
      const sub = state.subtasks.find((s) => s.id === subtaskId);
      if (!sub) return false;

      const newCompleted = !sub.isCompleted;

      // Optimistic 0ms update
      dispatch({
        type: 'OPTIMISTIC_TOGGLE_SUBTASK',
        payload: { subtaskId, isCompleted: newCompleted },
      });

      try {
        const { error } = await supabase
          .from('subtasks')
          .update({ is_completed: newCompleted })
          .eq('id', subtaskId);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Subtask toggle failed, rolling back:', err);
        dispatch({
          type: 'ROLLBACK_TOGGLE_SUBTASK',
          payload: { subtaskId, isCompleted: !newCompleted },
        });
        return false;
      }
    },
    [state.subtasks]
  );

  // 3. Add Subtask via Enter Key
  const addSubtask = useCallback(
    async (taskId: string, title: string): Promise<boolean> => {
      if (!title.trim()) return false;

      const tempId = `temp-${Date.now()}`;
      const taskSubs = state.subtasks.filter((s) => s.taskId === taskId);
      const position = taskSubs.length;

      const tempSubtask: Subtask = {
        id: tempId,
        taskId,
        title: title.trim(),
        isCompleted: false,
        position,
        createdAt: new Date().toISOString(),
      };

      // Optimistic 0ms insertion
      dispatch({ type: 'OPTIMISTIC_ADD_SUBTASK', payload: { subtask: tempSubtask } });

      try {
        const { data, error } = await supabase
          .from('subtasks')
          .insert({
            task_id: taskId,
            title: title.trim(),
            is_completed: false,
            position,
          });

        if (error) throw error;

        const inserted = Array.isArray(data) ? data[0] : data;
        const confirmedSubtask: Subtask = {
          id: inserted?.id || tempId,
          taskId: inserted?.task_id || taskId,
          title: inserted?.title || title.trim(),
          isCompleted: inserted?.is_completed ?? false,
          position: inserted?.position ?? position,
          createdAt: inserted?.created_at || new Date().toISOString(),
        };

        dispatch({
          type: 'CONFIRM_ADD_SUBTASK',
          payload: { tempId, confirmedSubtask },
        });
        return true;
      } catch (err) {
        console.error('Add subtask failed, rolling back:', err);
        dispatch({ type: 'ROLLBACK_ADD_SUBTASK', payload: { tempId } });
        return false;
      }
    },
    [state.subtasks]
  );

  // 4. Add Comment
  const addComment = useCallback(
    async (taskId: string, content: string): Promise<boolean> => {
      if (!content.trim() || !user) return false;

      const tempId = `temp-comm-${Date.now()}`;
      const tempComment: TaskComment = {
        id: tempId,
        taskId,
        authorId: user.id,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };

      // Optimistic 0ms insertion
      dispatch({ type: 'OPTIMISTIC_ADD_COMMENT', payload: { comment: tempComment } });

      try {
        const { data, error } = await supabase
          .from('task_comments')
          .insert({
            task_id: taskId,
            author_id: user.id,
            content: content.trim(),
          });

        if (error) throw error;

        const inserted = Array.isArray(data) ? data[0] : data;
        const confirmedComment: TaskComment = {
          id: inserted?.id || tempId,
          taskId: inserted?.task_id || taskId,
          authorId: inserted?.author_id || user.id,
          content: inserted?.content || content.trim(),
          createdAt: inserted?.created_at || new Date().toISOString(),
        };

        dispatch({
          type: 'CONFIRM_ADD_COMMENT',
          payload: { tempId, confirmedComment },
        });
        return true;
      } catch (err) {
        console.error('Add comment failed, rolling back:', err);
        dispatch({ type: 'ROLLBACK_ADD_COMMENT', payload: { tempId } });
        return false;
      }
    },
    [user]
  );

  // 5. Promote Task to Active Hero ('Passa a questa task →')
  const promoteToActiveTask = useCallback(
    async (targetTaskId: string): Promise<boolean> => {
      const prevActiveTaskId = state.activeTaskId;
      const targetTask = state.tasks.find((t) => t.id === targetTaskId);
      if (!targetTask || !user) return false;

      // A. Stop active timer on previous task if running
      if (isTimerRunning && prevActiveTaskId) {
        await stopTimer();
      }

      // B. Optimistic 0ms promotion
      dispatch({
        type: 'OPTIMISTIC_PROMOTE_TASK',
        payload: { newActiveTaskId: targetTaskId },
      });

      // C. Synchronize Timer's Active Task
      await setTimerActiveTask({
        id: targetTask.id,
        title: targetTask.title,
        status: targetTask.status,
      });

      try {
        // Persist active task on user profile
        const { error: profErr } = await supabase
          .from('profiles')
          .update({ active_task_id: targetTaskId })
          .eq('id', user.id);

        if (profErr) throw profErr;

        // Optionally adjust queue order in DB
        await supabase.from('tasks').update({ queue_order: 0 }).eq('id', targetTaskId);
        if (prevActiveTaskId) {
          await supabase.from('tasks').update({ queue_order: 1 }).eq('id', prevActiveTaskId);
        }

        return true;
      } catch (err) {
        console.error('Task promotion failed, rolling back:', err);
        dispatch({
          type: 'ROLLBACK_PROMOTE_TASK',
          payload: { previousActiveTaskId: prevActiveTaskId },
        });
        return false;
      }
    },
    [state.activeTaskId, state.tasks, user, isTimerRunning, stopTimer, setTimerActiveTask]
  );

  // 6. Assign Orphan Task
  const assignOrphanTask = useCallback(
    async (taskId?: string, assigneeId?: string): Promise<boolean> => {
      const target = taskId
        ? state.tasks.find((t) => t.id === taskId)
        : state.tasks.find((t) => t.assigneeId === null);

      if (!target) return false;

      const targetAssigneeId = assigneeId || user?.id || (members[0]?.userId ?? null);
      if (!targetAssigneeId) return false;

      const prevAssigneeId = target.assigneeId;

      // Optimistic 0ms assignment
      dispatch({
        type: 'OPTIMISTIC_ASSIGN_ORPHAN',
        payload: { taskId: target.id, assigneeId: targetAssigneeId },
      });

      try {
        const { error } = await supabase
          .from('tasks')
          .update({ assignee_id: targetAssigneeId })
          .eq('id', target.id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Assign orphan task failed, rolling back:', err);
        dispatch({
          type: 'ROLLBACK_ASSIGN_ORPHAN',
          payload: { taskId: target.id, previousAssigneeId: prevAssigneeId },
        });
        return false;
      }
    },
    [state.tasks, user?.id, members]
  );

  // --------------------------------------------------------------------------
  // DERIVED DATA & VIEW MODELS
  // --------------------------------------------------------------------------

  // A. Active Task with Details
  const activeTask = useMemo((): TaskWithDetails | null => {
    if (!state.activeTaskId) return null;
    const task = state.tasks.find((t) => t.id === state.activeTaskId);
    if (!task) return null;

    return {
      ...task,
      assignee: members.find((m) => m.userId === task.assigneeId)?.profile || null,
      subtasks: state.subtasks.filter((s) => s.taskId === task.id),
      comments: state.comments.filter((c) => c.taskId === task.id),
      attachments: state.attachments.filter((a) => a.taskId === task.id),
    };
  }, [state.activeTaskId, state.tasks, state.subtasks, state.comments, state.attachments, members]);

  // B. Active Hero Task View Model (70% card)
  const activeHeroViewModel = useMemo((): ActiveHeroTaskViewModel | null => {
    if (!activeTask) return null;

    const spentMin = activeTask.loggedMinutes || 0;
    const estimateMin = activeTask.estimatedMinutes || 60;
    const pctTime = Math.min(100, Math.round((spentMin / (estimateMin || 1)) * 100));
    const completedSubs = activeTask.subtasks.filter((s) => s.isCompleted).length;

    return {
      task: activeTask,
      statusLabel: TASK_STATUS_TO_LABEL[activeTask.status] || 'In corso',
      spentFormatted: formatHoursMinutes(spentMin * 60),
      estimateFormatted: `${Math.round(estimateMin / 60)}h`,
      pctTime,
      subtasksCompleted: completedSubs,
      subtasksTotal: activeTask.subtasks.length,
      subtasks: activeTask.subtasks,
      comments: activeTask.comments,
      attachments: activeTask.attachments,
    };
  }, [activeTask]);

  // C. Queued Tasks for Logged In User
  const queuedTasks = useMemo((): Task[] => {
    if (!user) return [];
    return state.tasks
      .filter(
        (t) =>
          t.assigneeId === user.id &&
          t.id !== state.activeTaskId &&
          t.status !== 'completed'
      )
      .sort((a, b) => a.queueOrder - b.queueOrder);
  }, [state.tasks, state.activeTaskId, user]);

  // D. Queued Cards for 30% Right Column
  const queuedCards = useMemo((): QueuedTaskCard[] => {
    return queuedTasks.map((t) => {
      let tagType: 'amber' | 'rose' | 'none' = 'none';
      let tagText: string | undefined;

      if (t.blockingTarget) {
        tagType = 'amber';
        tagText = `⚠️ Bloccante per ${t.blockingTarget}`;
      } else if (t.status === 'blocked') {
        tagType = 'rose';
        tagText = `⛔ Bloccata: ${t.blockerReason || 'In attesa'}`;
      }

      // Calculate due urgency (within 3 days)
      let dueUrgent = false;
      let dueDateFormatted = 'Nessuna scadenza';
      if (t.dueDate) {
        const diffMs = new Date(t.dueDate).getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
          dueDateFormatted = 'Oggi';
          dueUrgent = true;
        } else if (diffDays <= 3) {
          dueDateFormatted = `Entro ${diffDays}gg`;
          dueUrgent = true;
        } else {
          dueDateFormatted = `${diffDays}gg`;
        }
      }

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        statusLabel: TASK_STATUS_TO_LABEL[t.status],
        priority: t.priority,
        priorityLabel: TASK_PRIORITY_TO_LABEL[t.priority],
        departmentTag: t.departmentTag,
        dueDateFormatted,
        dueUrgent,
        estimatedFormatted: `${Math.round((t.estimatedMinutes || 0) / 60)}h`,
        tagType,
        tagText,
        metaText: `Stato: ${TASK_STATUS_TO_LABEL[t.status]} · Stima: ${Math.round(
          (t.estimatedMinutes || 0) / 60
        )}h`,
      };
    });
  }, [queuedTasks]);

  // E. Orphan Tasks (Unassigned)
  const orphanTasks = useMemo((): Task[] => {
    return state.tasks.filter((t) => t.assigneeId === null);
  }, [state.tasks]);

  // F. All Project Tasks for Kanban
  const allKanbanTasks = useMemo((): Task[] => {
    return state.tasks;
  }, [state.tasks]);

  // G. Team Member Overview (Admin 3x2 Grid)
  const teamMembersOverview = useMemo((): TeamMemberOverview[] => {
    return members.map((m) => {
      const uId = m.userId;
      const memberTasks = state.tasks.filter((t) => t.assigneeId === uId);
      const active =
        memberTasks.find((t) => t.status === 'in_progress') ||
        memberTasks.find((t) => t.status === 'blocked') ||
        memberTasks[0] ||
        null;

      const activeSubs = active ? state.subtasks.filter((s) => s.taskId === active.id) : [];

      const loggedMin = memberTasks.reduce((acc, t) => acc + (t.loggedMinutes || 0), 0);
      const estMin = memberTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
      const queueCount = memberTasks.filter((t) => t.id !== active?.id && t.status !== 'completed').length;

      return {
        userId: uId || m.id,
        initials: m.profile?.initials || m.userEmail.slice(0, 2).toUpperCase(),
        name: m.profile?.fullName || m.userEmail.split('@')[0],
        role: m.profile?.department || 'Team Member',
        department: m.profile?.department || '#CoreDev',
        avatarUrl: m.profile?.avatarUrl,
        activeTask: active
          ? {
              id: active.id,
              title: active.title,
              status: active.status,
              statusLabel: TASK_STATUS_TO_LABEL[active.status],
              subtasksCompleted: activeSubs.filter((s) => s.isCompleted).length,
              subtasksTotal: activeSubs.length,
              blockerReason: active.blockerReason,
            }
          : null,
        weeklyHoursLogged: Math.round(loggedMin / 60),
        weeklyHoursEstimated: Math.max(35, Math.round(estMin / 60)),
        queuedTasksCount: queueCount,
        weeklyCheckSubmitted: true,
      };
    });
  }, [members, state.tasks, state.subtasks]);

  const value = useMemo(
    () => ({
      tasks: state.tasks,
      subtasks: state.subtasks,
      comments: state.comments,
      attachments: state.attachments,
      activeTaskId: state.activeTaskId,
      isLoading: state.isLoading,
      error: state.error,
      activeTask,
      activeHeroViewModel,
      queuedTasks,
      queuedCards,
      orphanTasks,
      allKanbanTasks,
      teamMembersOverview,
      changeStatus,
      toggleSubtask,
      addSubtask,
      addComment,
      promoteToActiveTask,
      assignOrphanTask,
      refreshTasks,
    }),
    [
      state,
      activeTask,
      activeHeroViewModel,
      queuedTasks,
      queuedCards,
      orphanTasks,
      allKanbanTasks,
      teamMembersOverview,
      changeStatus,
      toggleSubtask,
      addSubtask,
      addComment,
      promoteToActiveTask,
      assignOrphanTask,
      refreshTasks,
    ]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
