import { Database } from './database.types';

// ============================================================================
// DATABASE TABLE TYPE ALIASES
// ============================================================================
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type ProjectMemberRow = Database['public']['Tables']['project_members']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type SubtaskRow = Database['public']['Tables']['subtasks']['Row'];
export type TimeLogRow = Database['public']['Tables']['time_logs']['Row'];
export type TaskCommentRow = Database['public']['Tables']['task_comments']['Row'];
export type TaskAttachmentRow = Database['public']['Tables']['task_attachments']['Row'];
export type WeeklyCheckRow = Database['public']['Tables']['weekly_checks']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

// ============================================================================
// CORE DOMAIN ENUMS & LITERALS
// ============================================================================
export type UserRole = 'admin' | 'user';

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'in_review'
  | 'completed';

export type TaskStatusLabel =
  | 'Non iniziata'
  | 'In corso'
  | 'Bloccato'
  | 'In revisione'
  | 'Completata';

export const TASK_STATUS_TO_LABEL: Record<TaskStatus, TaskStatusLabel> = {
  not_started: 'Non iniziata',
  in_progress: 'In corso',
  blocked: 'Bloccato',
  in_review: 'In revisione',
  completed: 'Completata',
};

export const LABEL_TO_TASK_STATUS: Record<TaskStatusLabel, TaskStatus> = {
  'Non iniziata': 'not_started',
  'In corso': 'in_progress',
  'Bloccato': 'blocked',
  'In revisione': 'in_review',
  'Completata': 'completed',
};

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskPriorityLabel = 'Bassa' | 'Media' | 'Alta';

export const TASK_PRIORITY_TO_LABEL: Record<TaskPriority, TaskPriorityLabel> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
};

export const LABEL_TO_TASK_PRIORITY: Record<TaskPriorityLabel, TaskPriority> = {
  'Bassa': 'low',
  'Media': 'medium',
  'Alta': 'high',
};

export type DepartmentTag =
  | '#CoreDev'
  | '#CoreGameplay'
  | '#TechArt'
  | '#3DEnv'
  | '#Audio'
  | '#UI/UX'
  | '#VFX'
  | string;

export type NotificationType =
  | 'assigned'
  | 'comment'
  | 'due_soon'
  | 'review_result'
  | 'unblocked';

export type WorkloadFeeling = '1' | '2' | '3' | '4' | '5';

export type NavigationTab = 'dashboard' | 'kanban' | 'gantt';

// ============================================================================
// DOMAIN ENTITIES (Domain Models)
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  role: UserRole;
  department: string;
  activeTaskId: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userEmail: string;
  userId: string | null;
  invitedAt: string;
  profile?: Profile | null;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  position: number;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  departmentTag: DepartmentTag;
  assigneeId: string | null;
  queueOrder: number;
  estimatedMinutes: number;
  loggedMinutes: number;
  dueDate: string | null;
  startDate: string | null;
  blockerReason: string | null;
  blockingTarget: string | null;
  reviewOutputLink: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithDetails extends Task {
  assignee?: Profile | null;
  subtasks: Subtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
}

export interface TimeLog {
  id: string;
  projectId: string;
  userId: string;
  taskId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  isManualEdit: boolean;
  yearWeek: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author?: Profile | null;
  content: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploaderId: string;
  uploader?: Profile | null;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  createdAt: string;
}

export interface WeeklyCheck {
  id: string;
  projectId: string;
  userId: string;
  yearWeek: string;
  wentWell: string;
  obstacles: string;
  workloadFeeling: WorkloadFeeling;
  submittedAt: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  projectId: string | null;
  type: NotificationType;
  message: string;
  relatedTaskId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ============================================================================
// UI VIEW MODELS & DTOs
// ============================================================================

export interface QueuedTaskCard {
  id: string;
  title: string;
  status: TaskStatus;
  statusLabel: TaskStatusLabel;
  priority: TaskPriority;
  priorityLabel: TaskPriorityLabel;
  departmentTag: DepartmentTag;
  dueDateFormatted: string; // e.g. "Entro 3gg", "Oggi", "Scade tra 2gg"
  dueUrgent: boolean;
  estimatedFormatted: string; // e.g. "6h"
  tagType: 'amber' | 'rose' | 'none';
  tagText?: string; // e.g. "⚡ Bloccante per Audio Team" or "⛔ Bloccata da Modello 3D"
  metaText?: string;
}

export interface ActiveHeroTaskViewModel {
  task: Task;
  statusLabel: TaskStatusLabel;
  spentFormatted: string; // e.g. "6h 30m"
  estimateFormatted: string; // e.g. "10h"
  pctTime: number; // e.g. 65
  subtasksCompleted: number;
  subtasksTotal: number;
  subtasks: Subtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
}

export interface TeamMemberOverview {
  userId: string;
  initials: string;
  name: string;
  role: string;
  department: string;
  avatarUrl?: string | null;
  activeTask?: {
    id: string;
    title: string;
    status: TaskStatus;
    statusLabel: TaskStatusLabel;
    subtasksCompleted: number;
    subtasksTotal: number;
    blockerReason?: string | null;
  } | null;
  weeklyHoursLogged: number;
  weeklyHoursEstimated: number;
  queuedTasksCount: number;
  weeklyCheckSubmitted: boolean;
}

export interface WeeklyStats {
  currentWeekSeconds: number;
  historicalAvgSeconds: number;
  currentWeekFormatted: string; // e.g. "24h 30m"
  historicalAvgFormatted: string; // e.g. "36h/sett"
}

export interface ActiveTimerState {
  taskId: string | null;
  isRunning: boolean;
  seconds: number;
  startedAt: string | null;
}
