# Project: ArtLake Studio Task & Project Management Web App

## Architecture
- **Framework & Runtime**: React 19, TypeScript, Vite, Single-Page Application (PWA).
- **Backend / BaaS**: PostgreSQL / Supabase with comprehensive Row Level Security (RLS). Zero public/anon access.
- **State Management & Data Layer**: Reactive Stores (Zustand / React Context) with optimistic UI updates (0ms perceived latency) backed by Supabase client and resilient offline/mock adapters for hermetic testing.
- **Styling & Design System**: Dark studio theme (`#0b0a12`, `#161324`, `#7c5cff`, `#00e5a3`, `#ff4d6d`, `#ffb800`), 64px fixed Top Bar, zero vertical sidebar, blueprint 1:1 matching `artlake_studio_user_dashboard_prototype.html`.
- **Security & Authorization**: Pre-auth gate enforcing Google OAuth; Project whitelist check against `project_members`; Role-based permissions (`admin` vs `user`).

## Code Layout
```
c:\Users\francesco\Documents\ArtLake\ProjectManagement\
├── .agents/                    # Coordination metadata (no source code)
├── public/                     # Static assets, icons, manifest.json
├── src/
│   ├── assets/                 # SVGs, icons, static styles
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Button, Badge, Modal, Dropdown, Avatar
│   │   ├── layout/             # TopBar (64px), ProjectSelector, NavigationPill, TimerPill
│   │   ├── auth/               # LoginGate, UnauthorizedScreen, GoogleAuthButton
│   │   ├── dashboard/          # UserDashboard (Hero 70%, Queue 30%), AdminDashboard (Team 3x2, Orphan Backlog)
│   │   ├── kanban/             # KanbanBoard, KanbanColumn, TaskCard
│   │   └── gantt/              # GanttView, TimelineGrid, GanttBar
│   ├── context/                # AuthContext, ProjectContext, TimerContext, TaskContext
│   ├── hooks/                  # useAuth, useProject, useTimer, useTasks, useOptimistic
│   ├── services/               # supabaseClient, authService, projectService, taskService, timeLogService
│   ├── types/                  # database.types.ts, models.ts, api.types.ts
│   ├── utils/                  # timeCalculations.ts, dateUtils.ts, rlsHelpers.ts
│   ├── App.tsx                 # Root application component & routing
│   ├── main.tsx                # React 19 bootstrap
│   └── index.css               # Verbatim CSS tokens & variables from prototype
├── supabase/
│   └── migrations/             # 20261106_initial_schema_and_rls.sql
├── tests/
│   ├── unit/                   # Business logic unit tests (timer, calculations, auth)
│   ├── integration/            # Multi-project RLS isolation, state flows, role permissions
│   └── e2e/                    # End-to-end user journeys (Tiers 1-4)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Pre-Auth Gate (Google OAuth) | Blocks unauthenticated users; presents only Google login | M2 | SRS §2.2, Req R1 |
| 2 | Whitelist Unauthorized Screen | Blocks authenticated Google accounts not in `project_members` (and non-admin) with single Logout CTA | M2 | SRS §2.2, Req R1 |
| 3 | Auto-Binding Invite Trigger | Links pending email invites in `project_members` to newly authenticated user profile | M1 | SRS §6, Piano §2.2 |
| 4 | Studio Projects Management | Admin CRUD operations on `projects` partitioned workspace | M2 | Req R2, Piano §1.2 |
| 5 | Project Invitations & Membership | Admin invites Google emails to projects via `project_members` | M2 | Req R2, Piano §2.1 |
| 6 | Database Schema & Data Models | PostgreSQL 10-table schema (profiles, projects, tasks, time_logs, etc.) with circular FK handling | M1 | SRS §6, Piano §2.1 |
| 7 | Zero Anonymous Access (RLS) | All tables deny SELECT/INSERT/UPDATE/DELETE to `anon` role | M1 | Req R3, Piano §2.3 |
| 8 | Project Membership RLS Filtering | All operational queries filtered via `is_project_member(project_id)` | M1 | Req R3, Piano §2.3 |
| 9 | Role Permissions Matrix | `admin` has full management; `user` restricted to assigned projects | M2 | Req R2, SRS §2.3 |
| 10 | 64px Fixed Top Bar (Zero Sidebar) | Top bar with Zone 1 (brand, project pill, nav), Zone 2 (timer), Zone 3 (actions) | M3 | Req R4, SRS §3.1 |
| 11 | Adaptive Pill Timer (Auto-Start/Stop) | Auto-starts on `in_progress`, auto-stops on `blocked`/`review`/`done`, compacts in Kanban/Gantt | M3 | Req R4, SRS §5.1 |
| 12 | Manual Time Edit Modal (`✎`) | Allows manual correction of logged time with `is_manual_edit = true` | M3 | Req R4, SRS §5.1 |
| 13 | Weekly Hours & Excluded Average | Calculates weekly hours from Mon 00:00 and historical average excluding current week | M3 | Req R4, SRS §5.2 |
| 14 | User Dashboard (70% Active Hero Card) | Left hero card with status, blocker note, PR review link, progress bar, checklist, comments | M4 | Req R4, SRS §4.1 |
| 15 | User Dashboard (30% Priority Queue) | Right queue card with bottleneck tags and atomic optimistic promotion `Passa a questa task →` | M4 | Req R4, SRS §4.1 |
| 16 | Admin Dashboard (Team 3x2 Grid) | Overview grid of team members with active tasks, weekly hours progress, and blocker alerts | M4 | Req R4, SRS §4.2 |
| 17 | Admin Dashboard (Orphan Backlog) | Visual pill and drawer for tasks without assignee (`assignee_id IS NULL`) | M4 | Req R4, SRS §4.2 |
| 18 | Kanban Full-Width Board | 5-column board with drag & drop / quick status buttons and assignee filters | M4 | Req R4, SRS §4.3 |
| 19 | Gantt Timeline View | 290px frozen left column + 14-day timeline grid with `today-col` highlighting | M4 | Req R4, SRS §4.4 |
| 20 | Optimistic UI Updates | 0ms perceived latency on status changes, subtask checkboxes, and task promotions | M4 | Req R4, SRS §1.2 |
| 21 | Comprehensive E2E Test Suite | 4-tier requirement-driven test suite validating R1-R5 and acceptance criteria | M5 | Req R5, Dual Track |
| 22 | Adversarial Hardening (Tier 5) | White-box stress testing, boundary fuzzing, and concurrency validation | M5 | Dual Track §Phase 2 |
| 23 | Admin-Only Task Creation | Task creation restricted strictly to 'admin' role with all 10 domain properties | M6 | Req R2, PLAN.md |
| 24 | Universal Task Editing | Universal editing of all existing tasks across views for both 'admin' and 'user' | M6 | Req R3, PLAN.md |
| 25 | Task Creation & Editing Modal | Reusable TaskModal supporting all domain properties in create and edit modes | M6 | Req R1-R3, PLAN.md |
| 26 | Data Layer & RLS Enforcement | Task INSERT restricted to admin; UPDATE permitted for all project members | M6 | Req R2-R3, PLAN.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Foundation & Data Layer | Project scaffold (React 19 + Vite + TS + Vitest), DDL migrations, RLS policies, TypeScript types, Supabase client/mock adapter | none | DONE |
| M2 | Auth Gate, Whitelist & Multi-Project Engine | Google OAuth pre-auth gate, unauthorized whitelist screen, multi-project context, role permissions matrix | M1 | DONE |
| M3 | Top Bar, Adaptive Timer & Automations | 64px fixed Top Bar, adaptive timer state machine (auto-start/stop/compact), manual time edit (`✎`), weekly stats engine | M2 | DONE |
| M4 | Operational Views & Optimistic UI | User Dashboard (70/30), Admin Dashboard, Kanban board, Gantt view, optimistic updates | M3 | DONE |
| M5 | E2E Testing Track Pass & Coverage Hardening | 100% pass of Tiers 1-4 E2E tests, Tier 5 adversarial stress testing & coverage audit | M1, M2, M3, M4 | DONE |
| M6 | Admin-Only Task Creation & Universal Editing | Detailed plan (/plan), TaskModal, Admin-only creation, Universal editing, RLS & context guards, Vitest suite | M1-M5 | DONE |

## Interface Contracts

### Auth ↔ App Core
- `AuthProvider`: Exposes `{ user: Profile | null, session: Session | null, isLoading: boolean, isAuthorized: boolean, loginWithGoogle: () => Promise<void>, logout: () => Promise<void> }`.
- If `!session`: Renders `LoginGate`.
- If `session && !isAuthorized`: Renders `UnauthorizedScreen`.
- If `session && isAuthorized`: Renders main app shell.

### Project Context ↔ Views
- `ProjectProvider`: Exposes `{ currentProject: Project, userProjects: Project[], selectProject: (id: string) => void, members: ProjectMember[], isAdmin: boolean }`.
- Changing `currentProject` automatically re-scopes active task queries, queues, time logs, and stats.

### Timer Engine ↔ Task Store
- `TimerProvider`: Exposes `{ activeTaskId: string | null, isRunning: boolean, seconds: number, startTimer: (taskId: string) => void, stopTimer: () => Promise<void>, updateManualTime: (seconds: number) => Promise<void>, weeklyStats: { currentWeekSeconds: number, historicalAvgSeconds: number } }`.
- `onStatusChange(taskId, newStatus)`:
  - If `newStatus === 'in_progress'` and task is not currently timed → auto-start.
  - If `newStatus in ['blocked', 'in_review', 'completed']` and task is currently timed → auto-stop and record `time_logs`.
