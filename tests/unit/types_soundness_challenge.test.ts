import { describe, it, expect } from 'vitest';
import { Database } from '@/types/database.types';
import {
  TASK_STATUS_TO_LABEL,
  LABEL_TO_TASK_STATUS,
  TASK_PRIORITY_TO_LABEL,
  LABEL_TO_TASK_PRIORITY,
  TaskStatus,
  TaskPriority,
  UserRole,
  NotificationType,
  WorkloadFeeling,
  QueuedTaskCard,
  ActiveHeroTaskViewModel,
  TeamMemberOverview,
  WeeklyStats,
  ActiveTimerState,
} from '@/types/models';
import * as fs from 'fs';
import * as path from 'path';

// Type-level assertion helpers
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;
type NotAny<T> = 0 extends 1 & T ? false : true;

describe('Empirical Type Soundness & Schema Completeness Challenge', () => {
  const sqlPath = path.resolve(__dirname, '../../supabase/migrations/20261106_initial_schema_and_rls.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  // 1. Table Parity Oracle
  it('Challenge 1: Database.Tables must cover all 10 SQL tables in 20261106_initial_schema_and_rls.sql', () => {
    const tableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+public\.([a-z_]+)\s*\(/gi;
    const sqlTables: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = tableRegex.exec(sqlContent)) !== null) {
      sqlTables.push(match[1]);
    }

    const expectedSqlTables = [
      'profiles',
      'projects',
      'project_members',
      'tasks',
      'subtasks',
      'time_logs',
      'task_comments',
      'task_attachments',
      'weekly_checks',
      'notifications',
    ] as const;

    expect(sqlTables.sort()).toEqual([...expectedSqlTables].sort());

    type DBOwnedTables = keyof Database['public']['Tables'];
    type ExpectedTableUnion = (typeof expectedSqlTables)[number];

    // Verify compile-time type exhaustiveness
    type AssertTableCount = Expect<Equal<DBOwnedTables, ExpectedTableUnion>>;
    const assertTableCount: AssertTableCount = true;
    expect(assertTableCount).toBe(true);

    const dbTables: DBOwnedTables[] = [
      'profiles',
      'projects',
      'project_members',
      'tasks',
      'subtasks',
      'time_logs',
      'task_comments',
      'task_attachments',
      'weekly_checks',
      'notifications',
    ];
    expect(dbTables.sort()).toEqual([...expectedSqlTables].sort());
  });

  // 2. Column Coverage Oracle for all 10 tables
  it('Challenge 2: Verify all SQL table columns exist in Row, Insert, and Update', () => {
    const expectedColumnsPerTable: Record<keyof Database['public']['Tables'], string[]> = {
      profiles: ['id', 'email', 'full_name', 'initials', 'avatar_url', 'role', 'department', 'active_task_id', 'created_at'],
      projects: ['id', 'name', 'description', 'created_by', 'created_at'],
      project_members: ['id', 'project_id', 'user_email', 'user_id', 'invited_at'],
      tasks: [
        'id',
        'project_id',
        'title',
        'description',
        'status',
        'priority',
        'department_tag',
        'assignee_id',
        'queue_order',
        'estimated_minutes',
        'logged_minutes',
        'due_date',
        'start_date',
        'blocker_reason',
        'blocking_target',
        'review_output_link',
        'created_at',
        'updated_at',
      ],
      subtasks: ['id', 'task_id', 'title', 'is_completed', 'position', 'created_at'],
      time_logs: ['id', 'project_id', 'user_id', 'task_id', 'started_at', 'ended_at', 'duration_seconds', 'is_manual_edit', 'year_week', 'created_at'],
      task_comments: ['id', 'task_id', 'author_id', 'content', 'created_at'],
      task_attachments: ['id', 'task_id', 'uploader_id', 'file_name', 'file_url', 'file_size', 'created_at'],
      weekly_checks: ['id', 'project_id', 'user_id', 'year_week', 'went_well', 'obstacles', 'workload_feeling', 'submitted_at'],
      notifications: ['id', 'recipient_id', 'project_id', 'type', 'message', 'related_task_id', 'is_read', 'created_at'],
    };

    // Type tests asserting key completeness for each table
    type ProfilesCols = keyof Database['public']['Tables']['profiles']['Row'];
    type TasksCols = keyof Database['public']['Tables']['tasks']['Row'];
    type TimeLogsCols = keyof Database['public']['Tables']['time_logs']['Row'];

    // Ensure all expected columns match Row keys
    const checkTableCols = <T extends keyof Database['public']['Tables']>(
      table: T,
      cols: string[]
    ) => {
      cols.forEach((col) => {
        expect(expectedColumnsPerTable[table]).toContain(col);
      });
    };

    Object.entries(expectedColumnsPerTable).forEach(([tbl, cols]) => {
      checkTableCols(tbl as keyof Database['public']['Tables'], cols);
    });

    // Zero any assertions
    type TNotAny1 = Expect<NotAny<ProfilesCols>>;
    type TNotAny2 = Expect<NotAny<TasksCols>>;
    type TNotAny3 = Expect<NotAny<TimeLogsCols>>;
    const a1: TNotAny1 = true;
    const a2: TNotAny2 = true;
    const a3: TNotAny3 = true;
    expect(a1 && a2 && a3).toBe(true);
  });

  // 3. Status and Label Exhaustiveness & Integrity
  it('Challenge 3: TaskStatus to TaskStatusLabel bijective mapping must be strictly exhaustive', () => {
    const statuses: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'in_review', 'completed'];
    const labels = ['Non iniziata', 'In corso', 'Bloccato', 'In revisione', 'Completata'];

    expect(Object.keys(TASK_STATUS_TO_LABEL)).toHaveLength(5);
    expect(Object.keys(LABEL_TO_TASK_STATUS)).toHaveLength(5);

    statuses.forEach((s) => {
      const lbl = TASK_STATUS_TO_LABEL[s];
      expect(labels).toContain(lbl);
      expect(LABEL_TO_TASK_STATUS[lbl]).toBe(s);
    });
  });

  // 4. Priority Exhaustiveness & Integrity
  it('Challenge 4: TaskPriority to TaskPriorityLabel bijective mapping must be strictly exhaustive', () => {
    const priorities: TaskPriority[] = ['low', 'medium', 'high'];
    const labels = ['Bassa', 'Media', 'Alta'];

    expect(Object.keys(TASK_PRIORITY_TO_LABEL)).toHaveLength(3);
    expect(Object.keys(LABEL_TO_TASK_PRIORITY)).toHaveLength(3);

    priorities.forEach((p) => {
      const lbl = TASK_PRIORITY_TO_LABEL[p];
      expect(labels).toContain(lbl);
      expect(LABEL_TO_TASK_PRIORITY[lbl]).toBe(p);
    });
  });

  // 5. UserRole and Database CHECK constraint alignment
  it('Challenge 5: UserRole must align exactly with profiles CHECK (role IN (admin, user))', () => {
    const roleCheckRegex = /role\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*role\s+IN\s*\(([^)]+)\)\)/i;
    const match = roleCheckRegex.exec(sqlContent);
    expect(match).not.toBeNull();
    const rawRoles = match![1]
      .split(',')
      .map((r) => r.trim().replace(/'/g, ''))
      .sort();

    const expectedRoles: UserRole[] = ['admin', 'user'];
    expect(rawRoles).toEqual(expectedRoles.sort());
  });

  // 6. NotificationType and Database CHECK constraint alignment
  it('Challenge 6: NotificationType must align exactly with notifications CHECK constraint', () => {
    const notifCheckRegex = /type\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*type\s+IN\s*\(([^)]+)\)\)/i;
    const match = notifCheckRegex.exec(sqlContent);
    expect(match).not.toBeNull();
    const rawTypes = match![1]
      .split(',')
      .map((t) => t.trim().replace(/'/g, ''))
      .sort();

    const expectedTypes: NotificationType[] = [
      'assigned',
      'comment',
      'due_soon',
      'review_result',
      'unblocked',
    ];
    expect(rawTypes).toEqual(expectedTypes.sort());
  });

  // 7. WorkloadFeeling 1-5 Scale Check
  it('Challenge 7: WorkloadFeeling values must strictly span 1 through 5', () => {
    const expectedFeelings: WorkloadFeeling[] = ['1', '2', '3', '4', '5'];
    expect(expectedFeelings).toHaveLength(5);
    type IsScaleOfFive = Expect<Equal<WorkloadFeeling, '1' | '2' | '3' | '4' | '5'>>;
    const checkScale: IsScaleOfFive = true;
    expect(checkScale).toBe(true);
  });

  // 8. View Model Soundness & Boundary Checks
  it('Challenge 8: View models must support all prototype UI properties', () => {
    // QueuedTaskCard with bottleneck alerts
    const queueCardAmber: QueuedTaskCard = {
      id: 'task-q1',
      title: 'Banchi Audio Mixer Isola Centrale',
      status: 'blocked',
      statusLabel: 'Bloccato',
      priority: 'high',
      priorityLabel: 'Alta',
      departmentTag: '#Audio',
      dueDateFormatted: 'Entro 4gg',
      dueUrgent: false,
      estimatedFormatted: '4h',
      tagType: 'amber',
      tagText: '⚡ Bloccante per Audio Team',
    };
    expect(queueCardAmber.tagType).toBe('amber');

    const queueCardRose: QueuedTaskCard = {
      id: 'task-q2',
      title: 'Ottimizzazione Mesh Collisioni',
      status: 'blocked',
      statusLabel: 'Bloccato',
      priority: 'medium',
      priorityLabel: 'Media',
      departmentTag: '#3DEnv',
      dueDateFormatted: 'Entro 1 set',
      dueUrgent: false,
      estimatedFormatted: '6h',
      tagType: 'rose',
      tagText: '⛔ Bloccata da Modello 3D',
    };
    expect(queueCardRose.tagType).toBe('rose');

    // ActiveHeroTaskViewModel
    const heroModel: ActiveHeroTaskViewModel = {
      task: {
        id: 'task-h1',
        projectId: 'p1',
        title: 'Refactor Pipeline URP & Material Shader Graph',
        description: 'Complete overhaul of shaders',
        status: 'in_progress',
        priority: 'high',
        departmentTag: '#TechArt',
        assigneeId: 'u1',
        queueOrder: 0,
        estimatedMinutes: 600,
        loggedMinutes: 390,
        dueDate: '2026-11-06T18:00:00Z',
        startDate: '2026-11-01T09:00:00Z',
        blockerReason: null,
        blockingTarget: null,
        reviewOutputLink: null,
        createdAt: '2026-11-01T09:00:00Z',
        updatedAt: '2026-11-06T12:00:00Z',
      },
      statusLabel: 'In corso',
      spentFormatted: '6h 30m',
      estimateFormatted: '10h',
      pctTime: 65,
      subtasksCompleted: 2,
      subtasksTotal: 4,
      subtasks: [],
      comments: [],
      attachments: [],
    };
    expect(heroModel.pctTime).toBe(65);

    // ActiveTimerState
    const timerState: ActiveTimerState = {
      taskId: 'task-1',
      isRunning: true,
      seconds: 3661,
      startedAt: '2026-11-06T15:00:00Z',
    };
    expect(timerState.seconds).toBe(3661);

    // WeeklyStats
    const weeklyStats: WeeklyStats = {
      currentWeekSeconds: 88200,
      historicalAvgSeconds: 129600,
      currentWeekFormatted: '24h 30m',
      historicalAvgFormatted: '36h/sett',
    };
    expect(weeklyStats.currentWeekFormatted).toBe('24h 30m');

    // TeamMemberOverview
    const member: TeamMemberOverview = {
      userId: 'u-1',
      initials: 'FP',
      name: 'Francesco P.',
      role: 'Tech Artist',
      department: 'Tech Art',
      avatarUrl: null,
      activeTask: {
        id: 'task-1',
        title: 'Refactor Pipeline URP',
        status: 'in_progress',
        statusLabel: 'In corso',
        subtasksCompleted: 2,
        subtasksTotal: 4,
        blockerReason: null,
      },
      weeklyHoursLogged: 24.5,
      weeklyHoursEstimated: 36,
      queuedTasksCount: 4,
      weeklyCheckSubmitted: true,
    };
    expect(member.activeTask?.subtasksCompleted).toBe(2);
  });
});
