import { Database } from '../types/database.types';

export type TableName = keyof Database['public']['Tables'];

export interface MockDatabaseState {
  profiles: Database['public']['Tables']['profiles']['Row'][];
  projects: Database['public']['Tables']['projects']['Row'][];
  project_members: Database['public']['Tables']['project_members']['Row'][];
  tasks: Database['public']['Tables']['tasks']['Row'][];
  subtasks: Database['public']['Tables']['subtasks']['Row'][];
  time_logs: Database['public']['Tables']['time_logs']['Row'][];
  task_comments: Database['public']['Tables']['task_comments']['Row'][];
  task_attachments: Database['public']['Tables']['task_attachments']['Row'][];
  weekly_checks: Database['public']['Tables']['weekly_checks']['Row'][];
  notifications: Database['public']['Tables']['notifications']['Row'][];
}

export interface MockAuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    role?: 'admin' | 'user';
    department?: string;
    [key: string]: any;
  };
}

export interface MockAuthSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: MockAuthUser;
}

export interface PostgrestError {
  message: string;
  details?: string;
  hint?: string;
  code: string;
}

export interface PostgrestResponse<T> {
  data: T | null;
  error: PostgrestError | null;
  count?: number | null;
}

// Initial state creator
const createEmptyState = (): MockDatabaseState => ({
  profiles: [],
  projects: [],
  project_members: [],
  tasks: [],
  subtasks: [],
  time_logs: [],
  task_comments: [],
  task_attachments: [],
  weekly_checks: [],
  notifications: [],
});

class MockDatabase {
  private state: MockDatabaseState = createEmptyState();
  private currentSession: MockAuthSession | null = null;
  private authListeners: Array<(event: string, session: MockAuthSession | null) => void> = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.state = createEmptyState();
    this.currentSession = null;
    this.authListeners = [];
  }

  public getState(): MockDatabaseState {
    return this.state;
  }

  public seed(seedData: Partial<MockDatabaseState>): void {
    if (seedData.profiles) this.state.profiles = [...seedData.profiles];
    if (seedData.projects) this.state.projects = [...seedData.projects];
    if (seedData.project_members) this.state.project_members = [...seedData.project_members];
    if (seedData.tasks) this.state.tasks = [...seedData.tasks];
    if (seedData.subtasks) this.state.subtasks = [...seedData.subtasks];
    if (seedData.time_logs) this.state.time_logs = [...seedData.time_logs];
    if (seedData.task_comments) this.state.task_comments = [...seedData.task_comments];
    if (seedData.task_attachments) this.state.task_attachments = [...seedData.task_attachments];
    if (seedData.weekly_checks) this.state.weekly_checks = [...seedData.weekly_checks];
    if (seedData.notifications) this.state.notifications = [...seedData.notifications];
  }

  // --- Auth Session Methods ---
  public getSession(): MockAuthSession | null {
    return this.currentSession;
  }

  public setSession(session: MockAuthSession | null): void {
    this.currentSession = session;
    const event = session ? 'SIGNED_IN' : 'SIGNED_OUT';
    this.authListeners.forEach((listener) => listener(event, session));
  }

  public setMockUser(params: {
    id: string;
    email: string;
    role?: 'admin' | 'user';
    full_name?: string;
    department?: string;
  }): void {
    const user: MockAuthUser = {
      id: params.id,
      email: params.email,
      user_metadata: {
        full_name: params.full_name || params.email,
        role: params.role || 'user',
        department: params.department || 'Core Dev',
      },
    };

    const session: MockAuthSession = {
      access_token: `mock-jwt-${params.id}`,
      token_type: 'bearer',
      expires_in: 3600,
      user,
    };

    this.currentSession = session;
    this.handleNewUserTrigger(user);
    this.authListeners.forEach((listener) => listener('SIGNED_IN', session));
  }

  public addAuthListener(cb: (event: string, session: MockAuthSession | null) => void): () => void {
    this.authListeners.push(cb);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== cb);
    };
  }

  // --- Trigger Simulation: handle_new_user() ---
  public handleNewUserTrigger(user: MockAuthUser): void {
    const meta = user.user_metadata || {};
    const fullName = meta.full_name || user.email;
    const parts = fullName.trim().split(/\s+/);
    let initials = 'U';
    if (parts.length >= 2 && parts[0] && parts[1]) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0] && parts[0].length >= 1) {
      initials = parts[0][0].toUpperCase();
    }

    const existingIdx = this.state.profiles.findIndex((p) => p.id === user.id);
    if (existingIdx >= 0) {
      const existing = this.state.profiles[existingIdx];
      this.state.profiles[existingIdx] = {
        ...existing,
        email: user.email,
        full_name: fullName,
        avatar_url: meta.avatar_url || existing.avatar_url,
      };
    } else {
      this.state.profiles.push({
        id: user.id,
        email: user.email,
        full_name: fullName,
        initials: initials || 'U',
        avatar_url: meta.avatar_url || null,
        role: meta.role || 'user',
        department: meta.department || 'Core Dev',
        active_task_id: null,
        created_at: new Date().toISOString(),
      });
    }

    // Auto-Binding: link pending project invitations
    const lowerEmail = user.email.toLowerCase();
    for (const member of this.state.project_members) {
      if (member.user_email.toLowerCase() === lowerEmail) {
        member.user_id = user.id;
      }
    }
  }

  // --- RLS Evaluators ---
  public getAuthUid(): string | null {
    return this.currentSession?.user?.id ?? null;
  }

  public getAuthEmail(): string | null {
    return this.currentSession?.user?.email?.toLowerCase() ?? null;
  }

  public isAdmin(): boolean {
    const uid = this.getAuthUid();
    if (!uid) return false;
    const profile = this.state.profiles.find((p) => p.id === uid);
    return profile?.role === 'admin';
  }

  public isProjectMember(projectId: string): boolean {
    const uid = this.getAuthUid();
    const email = this.getAuthEmail();
    if (!uid && !email) return false;

    return this.state.project_members.some((pm) => {
      if (pm.project_id !== projectId) return false;
      if (uid && pm.user_id === uid) return true;
      if (email && pm.user_email.toLowerCase() === email) return true;
      return false;
    });
  }

  // --- Table RLS Check ---
  public canSelect(table: TableName, row: any): boolean {
    const uid = this.getAuthUid();
    if (!uid) return false; // Zero anon access

    if (this.isAdmin()) return true;

    switch (table) {
      case 'profiles':
        return true; // Authenticated users can view profiles
      case 'projects':
        return this.isProjectMember(row.id);
      case 'project_members':
        return this.isProjectMember(row.project_id);
      case 'tasks':
        return this.isProjectMember(row.project_id);
      case 'subtasks': {
        const parent = this.state.tasks.find((t) => t.id === row.task_id);
        return !!parent && this.isProjectMember(parent.project_id);
      }
      case 'time_logs':
        return this.isProjectMember(row.project_id);
      case 'task_comments':
      case 'task_attachments': {
        const parent = this.state.tasks.find((t) => t.id === row.task_id);
        return !!parent && this.isProjectMember(parent.project_id);
      }
      case 'weekly_checks':
        return row.user_id === uid;
      case 'notifications':
        return row.recipient_id === uid;
      default:
        return false;
    }
  }

  public canInsert(table: TableName, row: any): { ok: boolean; error?: PostgrestError } {
    const uid = this.getAuthUid();
    if (!uid) {
      return {
        ok: false,
        error: { message: 'new row violates row-level security policy', code: '42501' },
      };
    }

    if (this.isAdmin()) return { ok: true };

    switch (table) {
      case 'profiles':
        if (row.id !== uid) {
          return { ok: false, error: { message: 'permission denied for profiles', code: '42501' } };
        }
        if (row.role && row.role !== 'user' && !this.isAdmin()) {
          return { ok: false, error: { message: 'permission denied: cannot assign admin role', code: '42501' } };
        }
        return { ok: true };
      case 'projects':
        return { ok: false, error: { message: 'permission denied for projects', code: '42501' } };
      case 'project_members':
        return { ok: false, error: { message: 'permission denied for project_members', code: '42501' } };
      case 'tasks':
        return this.isProjectMember(row.project_id)
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for tasks', code: '42501' } };
      case 'subtasks': {
        const parent = this.state.tasks.find((t) => t.id === row.task_id);
        return parent && this.isProjectMember(parent.project_id)
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for subtasks', code: '42501' } };
      }
      case 'time_logs':
        return row.user_id === uid && this.isProjectMember(row.project_id)
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for time_logs', code: '42501' } };
      case 'task_comments':
      case 'task_attachments': {
        const parent = this.state.tasks.find((t) => t.id === row.task_id);
        const ownerId = row.author_id || row.uploader_id;
        return ownerId === uid && parent && this.isProjectMember(parent.project_id)
          ? { ok: true }
          : { ok: false, error: { message: `permission denied for ${table}`, code: '42501' } };
      }
      case 'weekly_checks':
        return row.user_id === uid && this.isProjectMember(row.project_id)
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for weekly_checks', code: '42501' } };
      case 'notifications':
        return { ok: true };
      default:
        return { ok: false, error: { message: 'permission denied', code: '42501' } };
    }
  }

  public canUpdate(table: TableName, row: any, payload?: any): { ok: boolean; error?: PostgrestError } {
    const uid = this.getAuthUid();
    if (!uid) {
      return {
        ok: false,
        error: { message: 'new row violates row-level security policy', code: '42501' },
      };
    }

    if (this.isAdmin()) return { ok: true };

    switch (table) {
      case 'profiles':
        if (row.id !== uid) {
          return { ok: false, error: { message: 'permission denied for profiles', code: '42501' } };
        }
        if (payload && 'role' in payload && payload.role !== row.role) {
          return { ok: false, error: { message: 'permission denied: cannot alter role', code: '42501' } };
        }
        return { ok: true };
      case 'projects':
      case 'project_members':
        return { ok: false, error: { message: `permission denied for ${table}`, code: '42501' } };
      case 'tasks':
        return this.isProjectMember(row.project_id)
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for tasks', code: '42501' } };
      case 'subtasks': {
        const parent = this.state.tasks.find((t) => t.id === row.task_id);
        return parent && this.isProjectMember(parent.project_id)
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for subtasks', code: '42501' } };
      }
      case 'time_logs':
        return row.user_id === uid
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for time_logs', code: '42501' } };
      case 'weekly_checks':
        return row.user_id === uid
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for weekly_checks', code: '42501' } };
      case 'notifications':
        return row.recipient_id === uid
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for notifications', code: '42501' } };
      default:
        return { ok: false, error: { message: 'permission denied', code: '42501' } };
    }
  }

  public canDelete(table: TableName, row: any): { ok: boolean; error?: PostgrestError } {
    const uid = this.getAuthUid();
    if (!uid) {
      return {
        ok: false,
        error: { message: 'permission denied for table', code: '42501' },
      };
    }

    if (this.isAdmin()) return { ok: true };

    switch (table) {
      case 'projects':
      case 'project_members':
      case 'tasks':
        return { ok: false, error: { message: `permission denied for ${table}`, code: '42501' } };
      case 'subtasks': {
        const parent = this.state.tasks.find((t) => t.id === row.task_id);
        return parent && this.isProjectMember(parent.project_id)
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for subtasks', code: '42501' } };
      }
      case 'time_logs':
        return row.user_id === uid
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for time_logs', code: '42501' } };
      case 'task_comments':
        return row.author_id === uid
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for task_comments', code: '42501' } };
      case 'task_attachments':
        return row.uploader_id === uid
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for task_attachments', code: '42501' } };
      case 'notifications':
        return row.recipient_id === uid
          ? { ok: true }
          : { ok: false, error: { message: 'permission denied for notifications', code: '42501' } };
      default:
        return { ok: false, error: { message: 'permission denied', code: '42501' } };
    }
  }

  // --- Relational Cascades ---
  public handleCascadeDelete(table: TableName, deletedRow: any): void {
    if (table === 'tasks') {
      const taskId = deletedRow.id;
      // profiles: active_task_id set null
      this.state.profiles.forEach((p) => {
        if (p.active_task_id === taskId) {
          p.active_task_id = null;
        }
      });
      // subtasks cascade
      this.state.subtasks = this.state.subtasks.filter((s) => s.task_id !== taskId);
      // time_logs cascade
      this.state.time_logs = this.state.time_logs.filter((tl) => tl.task_id !== taskId);
      // task_comments cascade
      this.state.task_comments = this.state.task_comments.filter((tc) => tc.task_id !== taskId);
      // task_attachments cascade
      this.state.task_attachments = this.state.task_attachments.filter((ta) => ta.task_id !== taskId);
      // notifications cascade
      this.state.notifications = this.state.notifications.filter((n) => n.related_task_id !== taskId);
    } else if (table === 'projects') {
      const projectId = deletedRow.id;
      // project_members cascade
      this.state.project_members = this.state.project_members.filter((pm) => pm.project_id !== projectId);
      // tasks cascade (and its children)
      const tasksToDelete = this.state.tasks.filter((t) => t.project_id === projectId);
      for (const t of tasksToDelete) {
        this.handleCascadeDelete('tasks', t);
      }
      this.state.tasks = this.state.tasks.filter((t) => t.project_id !== projectId);
      // time_logs cascade
      this.state.time_logs = this.state.time_logs.filter((tl) => tl.project_id !== projectId);
      // weekly_checks cascade
      this.state.weekly_checks = this.state.weekly_checks.filter((wc) => wc.project_id !== projectId);
      // notifications cascade
      this.state.notifications = this.state.notifications.filter((n) => n.project_id !== projectId);
    }
  }
}

export const sharedMockDatabase = new MockDatabase();

// --- Query Builder Implementation ---
export class MockQueryBuilder<T = any> implements PromiseLike<PostgrestResponse<T>> {
  private db: MockDatabase;
  private table: TableName;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  public selectColumns: string = '*';
  private insertPayload: any = null;
  private updatePayload: any = null;
  private filters: Array<(row: any) => boolean> = [];
  private orderField: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(db: MockDatabase, table: TableName) {
    this.db = db;
    this.table = table;
  }

  public select(columns: string = '*'): this {
    this.operation = 'select';
    this.selectColumns = columns;
    return this;
  }

  public insert(payload: any | any[]): this {
    this.operation = 'insert';
    this.insertPayload = payload;
    return this;
  }

  public update(payload: any): this {
    this.operation = 'update';
    this.updatePayload = payload;
    return this;
  }

  public delete(): this {
    this.operation = 'delete';
    return this;
  }

  public eq(column: string, value: any): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  public neq(column: string, value: any): this {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  public in(column: string, values: any[]): this {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  public is(column: string, value: any): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  public order(column: string, options?: { ascending?: boolean }): this {
    this.orderField = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  public limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  public single(): MockQueryBuilder<T extends Array<infer U> ? U : T> {
    this.isSingle = true;
    return this as unknown as MockQueryBuilder<T extends Array<infer U> ? U : T>;
  }

  public maybeSingle(): MockQueryBuilder<(T extends Array<infer U> ? U : T) | null> {
    this.isMaybeSingle = true;
    return this as unknown as MockQueryBuilder<(T extends Array<infer U> ? U : T) | null>;
  }

  public returns<NewT>(): MockQueryBuilder<NewT> {
    return this as unknown as MockQueryBuilder<NewT>;
  }

  private executeSync(): PostgrestResponse<any> {
    const tableState = this.db.getState()[this.table] as any[];

    // 1. SELECT OPERATION
    if (this.operation === 'select') {
      const uid = this.db.getAuthUid();
      if (!uid) {
        // Zero anon access returns empty array or null for single/maybeSingle
        return { data: (this.isSingle || this.isMaybeSingle) ? null : [], error: null, count: 0 };
      }

      // Filter by RLS
      let rows = tableState.filter((row) => this.db.canSelect(this.table, row));

      // Filter by query conditions
      for (const filter of this.filters) {
        rows = rows.filter(filter);
      }

      // Order
      if (this.orderField) {
        const field = this.orderField;
        const asc = this.orderAscending;
        rows = [...rows].sort((a, b) => {
          if (a[field] < b[field]) return asc ? -1 : 1;
          if (a[field] > b[field]) return asc ? 1 : -1;
          return 0;
        });
      }

      // Limit
      if (this.limitCount !== null) {
        rows = rows.slice(0, this.limitCount);
      }

      // Single / MaybeSingle
      if (this.isSingle) {
        if (rows.length === 1) {
          return { data: rows[0], error: null };
        }
        return {
          data: null,
          error: {
            message: 'JSON object requested, multiple (or no) rows returned',
            code: 'PGRST116',
          },
        };
      }

      if (this.isMaybeSingle) {
        if (rows.length === 1) {
          return { data: rows[0], error: null };
        }
        if (rows.length === 0) {
          return { data: null, error: null };
        }
        return {
          data: null,
          error: {
            message: 'JSON object requested, multiple rows returned',
            code: 'PGRST116',
          },
        };
      }

      return { data: rows, error: null, count: rows.length };
    }

    // 2. INSERT OPERATION
    if (this.operation === 'insert') {
      const items = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload];
      const inserted: any[] = [];

      for (const item of items) {
        const fullItem = {
          id: item.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        };

        // Unique constraints check
        if (this.table === 'project_members') {
          const duplicate = tableState.some(
            (pm) =>
              pm.project_id === fullItem.project_id &&
              pm.user_email.toLowerCase() === fullItem.user_email?.toLowerCase()
          );
          if (duplicate) {
            return {
              data: null,
              error: {
                message: 'duplicate key value violates unique constraint "unique_project_user_email"',
                code: '23505',
              },
            };
          }
        } else if (this.table === 'weekly_checks') {
          const duplicate = tableState.some(
            (wc) =>
              wc.user_id === fullItem.user_id &&
              wc.project_id === fullItem.project_id &&
              wc.year_week === fullItem.year_week
          );
          if (duplicate) {
            return {
              data: null,
              error: {
                message: 'duplicate key value violates unique constraint "unique_user_project_weekly_check"',
                code: '23505',
              },
            };
          }
        }

        // RLS check
        const rls = this.db.canInsert(this.table, fullItem);
        if (!rls.ok) {
          return { data: null, error: rls.error! };
        }

        tableState.push(fullItem);
        inserted.push(fullItem);
      }

      return {
        data: Array.isArray(this.insertPayload) ? inserted : inserted[0] || null,
        error: null,
      };
    }

    // 3. UPDATE OPERATION
    if (this.operation === 'update') {
      const uid = this.db.getAuthUid();
      if (!uid) {
        return {
          data: null,
          error: { message: 'new row violates row-level security policy', code: '42501' },
        };
      }

      const matched = tableState.filter((row) => this.filters.every((f) => f(row)));
      const updated: any[] = [];

      for (const row of matched) {
        const rls = this.db.canUpdate(this.table, row, this.updatePayload);
        if (!rls.ok) {
          return { data: null, error: rls.error! };
        }

        Object.assign(row, this.updatePayload);
        if (this.table === 'tasks') {
          row.updated_at = new Date().toISOString();
        }
        updated.push(row);
      }

      return {
        data: this.isSingle ? updated[0] || null : updated,
        error: null,
      };
    }

    // 4. DELETE OPERATION
    if (this.operation === 'delete') {
      const uid = this.db.getAuthUid();
      if (!uid) {
        return {
          data: null,
          error: { message: 'permission denied for table', code: '42501' },
        };
      }

      const matched = tableState.filter((row) => this.filters.every((f) => f(row)));
      const deleted: any[] = [];

      for (const row of matched) {
        const rls = this.db.canDelete(this.table, row);
        if (!rls.ok) {
          return { data: null, error: rls.error! };
        }

        const idx = tableState.indexOf(row);
        if (idx >= 0) {
          tableState.splice(idx, 1);
          this.db.handleCascadeDelete(this.table, row);
          deleted.push(row);
        }
      }

      return {
        data: this.isSingle ? deleted[0] || null : deleted,
        error: null,
      };
    }

    return { data: null, error: null };
  }

  public then<TResult1 = PostgrestResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: PostgrestResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.executeSync()).then(
      onfulfilled ? (res) => onfulfilled(res as unknown as PostgrestResponse<T>) : undefined,
      onrejected || undefined
    );
  }
}

// --- Mock Realtime Channel ---
export class MockRealtimeChannel {
  public readonly topic: string;

  constructor(topic: string) {
    this.topic = topic;
  }

  public on(_event: string, _filter: any, _callback: (payload: any) => void): this {
    return this;
  }

  public subscribe(callback?: (status: string) => void): this {
    if (callback) {
      setTimeout(() => callback('SUBSCRIBED'), 0);
    }
    return this;
  }

  public unsubscribe(): void {}
}

// --- Mock Supabase Client API ---
export class MockSupabaseClient {
  public auth = {
    getSession: async () => {
      const session = sharedMockDatabase.getSession();
      return { data: { session }, error: null };
    },
    getUser: async () => {
      const session = sharedMockDatabase.getSession();
      return { data: { user: session?.user || null }, error: null };
    },
    signInWithOAuth: async (params: { provider: string; options?: any }) => {
      if (params.provider === 'google') {
        const email = params.options?.queryParams?.mock_email || 'test.user@artlake.studio';
        const fullName = params.options?.queryParams?.mock_name || 'Test User';
        const id = params.options?.queryParams?.mock_id || 'mock-user-1';

        sharedMockDatabase.setMockUser({
          id,
          email,
          full_name: fullName,
        });

        return { data: { provider: 'google', url: null }, error: null };
      }
      return { data: { provider: params.provider, url: null }, error: null };
    },
    signOut: async () => {
      sharedMockDatabase.setSession(null);
      return { error: null };
    },
    onAuthStateChange: (callback: (event: string, session: MockAuthSession | null) => void) => {
      const unsubscribe = sharedMockDatabase.addAuthListener(callback);
      return {
        data: {
          subscription: {
            unsubscribe,
          },
        },
      };
    },
  };

  public from<T extends TableName>(table: T): MockQueryBuilder<Database['public']['Tables'][T]['Row'][]> {
    return new MockQueryBuilder<Database['public']['Tables'][T]['Row'][]>(sharedMockDatabase, table);
  }

  public channel(topic: string): MockRealtimeChannel {
    return new MockRealtimeChannel(topic);
  }

  public rpc(fn: string, args?: any): Promise<{ data: any; error: PostgrestError | null }> {
    if (fn === 'is_admin') {
      return Promise.resolve({ data: sharedMockDatabase.isAdmin(), error: null });
    }
    if (fn === 'is_project_member') {
      return Promise.resolve({
        data: sharedMockDatabase.isProjectMember(args?.p_project_id),
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  }

  // --- Test Utilities Harness ---
  public testUtils = {
    setSession: (session: MockAuthSession | null) => sharedMockDatabase.setSession(session),
    setMockUser: (params: {
      id: string;
      email: string;
      role?: 'admin' | 'user';
      full_name?: string;
      department?: string;
    }) => sharedMockDatabase.setMockUser(params),
    resetDatabase: () => sharedMockDatabase.reset(),
    seedDatabase: (seed: Partial<MockDatabaseState>) => sharedMockDatabase.seed(seed),
    getSnapshot: (): MockDatabaseState => JSON.parse(JSON.stringify(sharedMockDatabase.getState())),
    handleNewUserTrigger: (user: MockAuthUser) => sharedMockDatabase.handleNewUserTrigger(user),
  };
}

export const mockSupabase = new MockSupabaseClient();
