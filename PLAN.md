# Architectural & Application Plan (/plan)
## Admin-Only Task Creation & Universal Task Editing

**Project**: ArtLake Studio Task Management  
**Date**: 2026-11-07  
**Scope**: Requirements R1, R2, R3  

---

## 1. Executive Summary & Architectural Strategy

This plan defines the architectural, data-layer, and component-level design to enforce:
1. **Admin-Only Task Creation (R2)**: Only authenticated users with `role: 'admin'` can create new tasks with all domain properties (title, description, priority, department_tag, assignee, estimated minutes/hours, start/end dates, dependencies/blockingTarget). Users with `role: 'user'` are strictly precluded from task creation across UI controls, application contexts, and database RLS.
2. **Universal Task Editing (R3)**: All project members (both `admin` and `user` roles) can view and edit existing tasks across all views (KanbanBoard, GanttView, UserDashboard, AdminDashboard), modifying all domain properties.
3. **Zero Regression**: Full backward compatibility with the existing 18 test files (287 passing tests).

---

## 2. Authorization & Security Architecture (Defense-in-Depth)

To ensure both UI responsiveness and backend security, authorization is enforced across 4 coordinated tiers:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI Presentation Layer                                    │
│    - Admin: "+ Nuova Task" buttons visible in Kanban/Admin  │
│    - User: Creation buttons hidden / omitted from DOM       │
│    - Universal: Task editing modal accessible to both roles │
└──────────────────────────────┬──────────────────────────────┘
                               │
▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Context & State Management Layer (TaskContext)           │
│    - createTask(): checks `isAdmin`, rejects if non-admin   │
│    - updateTask(): open to all members of active project    │
└──────────────────────────────┬──────────────────────────────┘
                               │
▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Client Data Service & Mock Supabase (mockSupabase.ts)    │
│    - canInsert('tasks'): strictly requires `this.isAdmin()` │
│      rejection code: '42501' (permission denied)            │
│    - canUpdate('tasks'): allows `this.isProjectMember()`    │
└──────────────────────────────┬──────────────────────────────┘
                               │
▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Production Database RLS (PostgreSQL DDL)                 │
│    - INSERT policy: `WITH CHECK (public.is_admin())`        │
│    - UPDATE policy: `USING (is_admin() OR is_project_member)│
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Context & Data Layer Specifications

### 3.1 Type Definitions (`src/types/models.ts` and `src/types/database.types.ts`)

Introduce strongly typed parameter interfaces:

```typescript
export interface CreateTaskParams {
  title: string;
  description?: string;
  status?: TaskStatus;             // default: 'not_started'
  priority?: TaskPriority;         // default: 'medium'
  departmentTag?: DepartmentTag;   // default: '#CoreDev'
  assigneeId?: string | null;      // default: null
  estimatedMinutes?: number;       // default: 0
  startDate?: string | null;       // ISO date
  dueDate?: string | null;         // ISO date
  blockingTarget?: string | null;  // e.g. "Audio Team"
  blockerReason?: string | null;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  departmentTag?: DepartmentTag;
  assigneeId?: string | null;
  estimatedMinutes?: number;
  loggedMinutes?: number;
  startDate?: string | null;
  dueDate?: string | null;
  blockingTarget?: string | null;
  blockerReason?: string | null;
  reviewOutputLink?: string | null;
  queueOrder?: number;
}
```

### 3.2 `TaskContext.tsx` Interventions

1. **Context Interface Extension**:
   ```typescript
   export interface TaskContextType {
     // ... existing properties (tasks, subtasks, changeStatus, etc.)
     createTask: (params: CreateTaskParams) => Promise<{ data: Task | null; error: Error | null }>;
     updateTask: (taskId: string, params: UpdateTaskParams) => Promise<{ data: Task | null; error: Error | null }>;
   }
   ```

2. **`createTask` Implementation (Admin-Only Guard)**:
   - Dependency: obtain `isAdmin` from `useProject()` (or `useAuth()`).
   - Guard:
     ```typescript
     if (!isAdmin) {
       return { data: null, error: new Error('Permission denied: only admins can create tasks') };
     }
     if (!currentProject) {
       return { data: null, error: new Error('No active project selected') };
     }
     if (!params.title || !params.title.trim()) {
       return { data: null, error: new Error('Task title is required') };
     }
     ```
   - Persist to Supabase:
     ```typescript
     const { data, error } = await supabase
       .from('tasks')
       .insert({
         project_id: currentProject.id,
         title: params.title.trim(),
         description: params.description || '',
         status: params.status || 'not_started',
         priority: params.priority || 'medium',
         department_tag: params.departmentTag || '#CoreDev',
         assignee_id: params.assigneeId || null,
         estimated_minutes: params.estimatedMinutes || 0,
         logged_minutes: 0,
         start_date: params.startDate || null,
         due_date: params.dueDate || null,
         blocking_target: params.blockingTarget || null,
         blocker_reason: params.blockerReason || null,
         queue_order: state.tasks.length,
       })
       .select()
       .single();
     ```
   - On success: optimistic or immediate state refresh via `await refreshTasks()`.

3. **`updateTask` Implementation (Universal Member Access)**:
   - Guard: verify active project membership (`if (!currentProject) ...`).
   - Does **NOT** check `isAdmin` (both `admin` and `user` can execute).
   - Optimistic update: instantly update task in local `tasks` array.
   - Persist to Supabase:
     ```typescript
     const dbPayload: any = {};
     if (params.title !== undefined) dbPayload.title = params.title;
     if (params.description !== undefined) dbPayload.description = params.description;
     if (params.status !== undefined) dbPayload.status = params.status;
     if (params.priority !== undefined) dbPayload.priority = params.priority;
     if (params.departmentTag !== undefined) dbPayload.department_tag = params.departmentTag;
     if (params.assigneeId !== undefined) dbPayload.assignee_id = params.assigneeId;
     if (params.estimatedMinutes !== undefined) dbPayload.estimated_minutes = params.estimatedMinutes;
     if (params.startDate !== undefined) dbPayload.start_date = params.startDate;
     if (params.dueDate !== undefined) dbPayload.due_date = params.dueDate;
     if (params.blockingTarget !== undefined) dbPayload.blocking_target = params.blockingTarget;
     if (params.blockerReason !== undefined) dbPayload.blocker_reason = params.blockerReason;
     if (params.reviewOutputLink !== undefined) dbPayload.review_output_link = params.reviewOutputLink;
     
     const { data, error } = await supabase
       .from('tasks')
       .update(dbPayload)
       .eq('id', taskId)
       .select()
       .single();
     ```
   - On error: rollback optimistic state. On success: refresh or retain updated state.

### 3.3 `mockSupabase.ts` Interventions

Update `MockDatabase.canInsert(table, row)`:
```typescript
case 'tasks':
  // Admins are already allowed at line 261 (if (this.isAdmin()) return { ok: true };)
  // Non-admins are strictly rejected:
  return {
    ok: false,
    error: {
      message: 'permission denied for tasks: only admins can create tasks',
      code: '42501',
    },
  };
```

`MockDatabase.canUpdate(table, row)` remains:
```typescript
case 'tasks':
  return this.isProjectMember(row.project_id)
    ? { ok: true }
    : { ok: false, error: { message: 'permission denied for tasks', code: '42501' } };
```
This guarantees universal editing for all project members (`admin` and `user`).

---

## 4. UI Component Interventions

### 4.1 New Reusable Component: `TaskModal.tsx` (`src/components/tasks/TaskModal.tsx`)

Handles both Creation (Admin-only) and Editing (Universal):
- **Props**:
  - `isOpen: boolean`
  - `mode: 'create' | 'edit'`
  - `initialTask?: Task | null`
  - `onClose: () => void`
- **Fields supporting all 10 domain properties**:
  1. Title (`data-testid="task-form-title"`): Text input, required.
  2. Description (`data-testid="task-form-description"`): Multiline textarea.
  3. Priority (`data-testid="task-form-priority"`): Select dropdown (`low`, `medium`, `high`).
  4. Department Tag (`data-testid="task-form-department"`): Select dropdown (`#CoreDev`, `#CoreGameplay`, `#TechArt`, `#3DEnv`, `#Audio`, `#UI/UX`, `#VFX`).
  5. Assignee (`data-testid="task-form-assignee"`): Dropdown populated from `members` in `useProject()`, with "Nessun Assegnatario".
  6. Estimated Time (`data-testid="task-form-estimate"`): Number input (in minutes or hours).
  7. Start Date (`data-testid="task-form-start-date"`): Input type `date`.
  8. Due Date (`data-testid="task-form-due-date"`): Input type `date`.
  9. Blocking Target (`data-testid="task-form-blocking-target"`): Text input (e.g., "Audio Team").
  10. Status (`data-testid="task-form-status"`): Select dropdown (in edit mode).
- **Controls**:
  - Submit Button: `data-testid="task-form-submit-btn"`
  - Cancel Button: `data-testid="task-form-cancel-btn"`

### 4.2 Component-by-Component Integration Matrix

| Component | File Path | Creation Trigger (Admin Only) | Edit Trigger (Universal) |
|---|---|---|---|
| **TopBar** | `src/components/layout/TopBar.tsx` | No task creation button needed (keeps 64px compact blueprint). | N/A |
| **AdminDashboard** | `src/components/dashboard/AdminDashboard.tsx` | "+ Nuova Task" button (`data-testid="admin-create-task-btn"`) in toolbar header next to orphan button. | N/A (Admin manages team overview, can edit from cards). |
| **KanbanBoard** | `src/components/kanban/KanbanBoard.tsx` | "+ Nuova Task" button (`data-testid="create-task-btn"`) rendered in header toolbar **only if `isAdmin` is true**. | Edit button or card click (`data-testid={`kanban-edit-${task.id}`}`) opening `TaskModal` in edit mode for **both admin and user**. |
| **UserDashboard** | `src/components/dashboard/UserDashboard.tsx` | Strictly **NO** creation button rendered (omitted from DOM). | "Modifica Task" button (`data-testid="edit-hero-task-btn"`) on Hero active card for **both admin and user**. |
| **GanttView** | `src/components/gantt/GanttView.tsx` | Strictly **NO** creation button rendered (omitted from DOM). | Click on row or timeline bar (`data-testid={`gantt-edit-${task.id}`}`) opening `TaskModal` in edit mode for **both admin and user**. |

---

## 5. Verification & Test Plan

### 5.1 New Automated Test Suite (`tests/integration/task_permissions_crud.test.tsx`)
Create a dedicated comprehensive test file verifying:
1. **Admin Task Creation**:
   - Admin user sees `create-task-btn` in KanbanBoard and `admin-create-task-btn` in AdminDashboard.
   - Admin fills all 10 fields in `TaskModal` and submits; task persists and appears in state.
   - `createTask` in `TaskContext` returns success.
2. **User Creation Restriction**:
   - User with `role: 'user'` does NOT see `create-task-btn` in KanbanBoard or any view (`queryByTestId('create-task-btn') === null`).
   - Calling `createTask` in `TaskContext` as `user` fails with `'Permission denied: only admins can create tasks'`.
   - Direct `supabase.from('tasks').insert(...)` as `user` fails with code `'42501'`.
3. **Universal Task Editing**:
   - Both `admin` and `user` can open `TaskModal` in edit mode from KanbanBoard (`kanban-edit-${task.id}`), UserDashboard (`edit-hero-task-btn`), and GanttView.
   - Both `admin` and `user` can update task title, description, priority, department, assignee, estimate, dates, blockingTarget.
   - `updateTask` in `TaskContext` succeeds for both roles.
   - Direct `supabase.from('tasks').update(...)` succeeds for both roles on member projects.

### 5.2 Full Regression Test Run
Run the full test suite with `npm.cmd run test:run`:
- Ensure all 18 existing test files continue to pass 100%.
- Ensure total tests passing increases beyond the baseline 287.

---

## 6. Execution Milestones

- **Milestone A**: Data Layer & Authorization Hardening (`mockSupabase.ts`, `models.ts`, `database.types.ts`).
- **Milestone B**: Context Layer (`TaskContext.tsx` with `createTask` and `updateTask`).
- **Milestone C**: UI Modal & View Integration (`TaskModal.tsx`, `KanbanBoard.tsx`, `AdminDashboard.tsx`, `UserDashboard.tsx`, `GanttView.tsx`).
- **Milestone D**: Test Suite Creation & Full Regression Verification (`tests/integration/task_permissions_crud.test.tsx` + `npm.cmd run test:run`).
- **Milestone E**: Multi-Agent Verification (Reviewers, Challengers, Forensic Auditor).
