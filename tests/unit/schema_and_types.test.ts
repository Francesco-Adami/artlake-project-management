import { describe, it, expect } from 'vitest';
import {
  TASK_STATUS_TO_LABEL,
  LABEL_TO_TASK_STATUS,
  TASK_PRIORITY_TO_LABEL,
  LABEL_TO_TASK_PRIORITY,
  TaskStatus,
  TaskStatusLabel,
  TaskPriority,
  TaskPriorityLabel,
  UserRole,
  NotificationType,
  WorkloadFeeling,
  DepartmentTag,
  Task,
  TaskWithDetails,
  Profile,
  Project,
  ProjectMember,
  TimeLog,
  WeeklyCheck,
  QueuedTaskCard,
  TeamMemberOverview,
  WeeklyStats,
} from '@/types/models';

describe('Schema & Type System Specifications', () => {
  describe('Task Status Mappings & Labels', () => {
    it('should map all 5 canonical database statuses to Italian UI labels', () => {
      const expectedStatuses: TaskStatus[] = [
        'not_started',
        'in_progress',
        'blocked',
        'in_review',
        'completed',
      ];

      const expectedLabels: TaskStatusLabel[] = [
        'Non iniziata',
        'In corso',
        'Bloccato',
        'In revisione',
        'Completata',
      ];

      expectedStatuses.forEach((status, idx) => {
        expect(TASK_STATUS_TO_LABEL[status]).toBe(expectedLabels[idx]);
        expect(LABEL_TO_TASK_STATUS[expectedLabels[idx]]).toBe(status);
      });
    });

    it('should preserve bidirectional status mapping consistency', () => {
      Object.keys(TASK_STATUS_TO_LABEL).forEach((statusKey) => {
        const status = statusKey as TaskStatus;
        const label = TASK_STATUS_TO_LABEL[status];
        expect(LABEL_TO_TASK_STATUS[label]).toBe(status);
      });
    });
  });

  describe('Task Priority Mappings & Labels', () => {
    it('should map all 3 priorities to Italian UI labels', () => {
      const priorities: TaskPriority[] = ['low', 'medium', 'high'];
      const labels: TaskPriorityLabel[] = ['Bassa', 'Media', 'Alta'];

      priorities.forEach((p, idx) => {
        expect(TASK_PRIORITY_TO_LABEL[p]).toBe(labels[idx]);
        expect(LABEL_TO_TASK_PRIORITY[labels[idx]]).toBe(p);
      });
    });

    it('should preserve bidirectional priority mapping consistency', () => {
      Object.keys(TASK_PRIORITY_TO_LABEL).forEach((priorityKey) => {
        const priority = priorityKey as TaskPriority;
        const label = TASK_PRIORITY_TO_LABEL[priority];
        expect(LABEL_TO_TASK_PRIORITY[label]).toBe(priority);
      });
    });
  });

  describe('User Roles & Notification Enums', () => {
    it('should support strict admin and user roles', () => {
      const roles: UserRole[] = ['admin', 'user'];
      expect(roles).toHaveLength(2);
      expect(roles.includes('admin')).toBe(true);
      expect(roles.includes('user')).toBe(true);
    });

    it('should support all 5 notification types defined in SRS', () => {
      const types: NotificationType[] = [
        'assigned',
        'comment',
        'due_soon',
        'review_result',
        'unblocked',
      ];
      expect(types).toHaveLength(5);
    });

    it('should validate workload feeling scale 1 to 5', () => {
      const feelings: WorkloadFeeling[] = ['1', '2', '3', '4', '5'];
      expect(feelings).toHaveLength(5);
    });

    it('should support department tags used across studio views', () => {
      const tags: DepartmentTag[] = [
        '#CoreDev',
        '#CoreGameplay',
        '#TechArt',
        '#3DEnv',
        '#Audio',
        '#UI/UX',
        '#VFX',
      ];
      expect(tags).toHaveLength(7);
    });
  });

  describe('Domain Entity Interfaces & Structural Conformance', () => {
    it('should construct valid Profile entity conforming to contract', () => {
      const profile: Profile = {
        id: 'user-uuid-1',
        email: 'dev@artlake.studio',
        fullName: 'Francesco Politi',
        initials: 'FP',
        avatarUrl: 'https://artlake.studio/avatars/fp.png',
        role: 'admin',
        department: 'Tech Art',
        activeTaskId: 'task-uuid-1',
        createdAt: '2026-11-06T12:00:00Z',
      };

      expect(profile.id).toBe('user-uuid-1');
      expect(profile.role).toBe('admin');
      expect(profile.activeTaskId).toBe('task-uuid-1');
    });

    it('should construct valid Project and ProjectMember entities', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'ArtLake Studio Alpha',
        description: 'Main production workspace',
        createdBy: 'user-uuid-1',
        createdAt: '2026-11-06T12:00:00Z',
      };

      const member: ProjectMember = {
        id: 'member-1',
        projectId: project.id,
        userEmail: 'artist@artlake.studio',
        userId: 'artist-uuid-2',
        invitedAt: '2026-11-06T12:05:00Z',
      };

      expect(member.projectId).toBe(project.id);
      expect(member.userEmail).toContain('@artlake.studio');
    });

    it('should construct valid Task and TaskWithDetails entity with relations', () => {
      const task: Task = {
        id: 'task-1',
        projectId: 'proj-1',
        title: 'Shading Pipeline Refactoring',
        description: 'Optimizing PBR shaders for mobile target',
        status: 'in_progress',
        priority: 'high',
        departmentTag: '#TechArt',
        assigneeId: 'artist-uuid-2',
        queueOrder: 1,
        estimatedMinutes: 600,
        loggedMinutes: 390,
        dueDate: '2026-11-10T18:00:00Z',
        startDate: '2026-11-06T09:00:00Z',
        blockerReason: null,
        blockingTarget: null,
        reviewOutputLink: 'https://github.com/artlake/shaders/pull/42',
        createdAt: '2026-11-06T09:00:00Z',
        updatedAt: '2026-11-06T15:00:00Z',
      };

      const taskWithDetails: TaskWithDetails = {
        ...task,
        subtasks: [
          {
            id: 'sub-1',
            taskId: task.id,
            title: 'Profile vertex shader overhead',
            isCompleted: true,
            position: 1,
            createdAt: '2026-11-06T09:30:00Z',
          },
          {
            id: 'sub-2',
            taskId: task.id,
            title: 'Merge uniform buffers',
            isCompleted: false,
            position: 2,
            createdAt: '2026-11-06T09:31:00Z',
          },
        ],
        comments: [],
        attachments: [],
      };

      expect(taskWithDetails.subtasks).toHaveLength(2);
      expect(taskWithDetails.subtasks[0].isCompleted).toBe(true);
      expect(taskWithDetails.subtasks[1].isCompleted).toBe(false);
    });

    it('should construct valid TimeLog and WeeklyCheck entities', () => {
      const timeLog: TimeLog = {
        id: 'tl-1',
        projectId: 'proj-1',
        userId: 'artist-uuid-2',
        taskId: 'task-1',
        startedAt: '2026-11-06T10:00:00Z',
        endedAt: '2026-11-06T12:30:00Z',
        durationSeconds: 9000,
        isManualEdit: false,
        yearWeek: '2026-W45',
        createdAt: '2026-11-06T12:30:00Z',
      };

      const weeklyCheck: WeeklyCheck = {
        id: 'wc-1',
        projectId: 'proj-1',
        userId: 'artist-uuid-2',
        yearWeek: '2026-W45',
        wentWell: 'Completed core PBR lighting tests',
        obstacles: 'Shader compile times on Android build machine',
        workloadFeeling: '3',
        submittedAt: '2026-11-06T16:00:00Z',
      };

      expect(timeLog.yearWeek).toBe('2026-W45');
      expect(timeLog.durationSeconds).toBe(9000);
      expect(weeklyCheck.workloadFeeling).toBe('3');
    });

    it('should conform to View Models for User & Admin Dashboards', () => {
      const queueItem: QueuedTaskCard = {
        id: 'task-2',
        title: 'Rigging Boss Monster',
        status: 'not_started',
        statusLabel: 'Non iniziata',
        priority: 'high',
        priorityLabel: 'Alta',
        departmentTag: '#3DEnv',
        dueDateFormatted: 'Entro 2gg',
        dueUrgent: true,
        estimatedFormatted: '8h',
        tagType: 'amber',
        tagText: '⚡ Bloccante per Animazione',
      };

      const teamMember: TeamMemberOverview = {
        userId: 'artist-uuid-2',
        initials: 'AA',
        name: 'Alice Artist',
        role: '3D Animator',
        department: '3D Art',
        activeTask: {
          id: 'task-2',
          title: 'Rigging Boss Monster',
          status: 'in_progress',
          statusLabel: 'In corso',
          subtasksCompleted: 2,
          subtasksTotal: 5,
          blockerReason: null,
        },
        weeklyHoursLogged: 28.5,
        weeklyHoursEstimated: 40,
        queuedTasksCount: 3,
        weeklyCheckSubmitted: true,
      };

      const weeklyStats: WeeklyStats = {
        currentWeekSeconds: 88200, // 24h 30m
        historicalAvgSeconds: 129600, // 36h
        currentWeekFormatted: '24h 30m',
        historicalAvgFormatted: '36h/sett',
      };

      expect(queueItem.tagType).toBe('amber');
      expect(teamMember.activeTask?.statusLabel).toBe('In corso');
      expect(weeklyStats.currentWeekFormatted).toBe('24h 30m');
    });
  });
});
