# E2E Test Infra: ArtLake Studio Task & Project Management Web App

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Tests are derived strictly from `ORIGINAL_REQUEST.md`, `specifiche_tecniche_e_funzionali_project_task_management_app.md`, and the prototype specifications.
- **Methodology**: Systematic 4-tier testing (Category-Partition, Boundary Value Analysis, Pairwise Combinatorial, Real-World Scenarios).
- **Zero Flakiness**: Deterministic tests using Vitest and React Testing Library, with hermetic mock/in-memory data layer capable of verifying full business logic, RLS security rules, timer automations, and optimistic UI transitions.

## Feature Inventory & Test Coverage Matrix
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|--------|:-----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | Pre-Auth Gate (Google OAuth) | R1 | 5 | 5 | ✓ | ✓ |
| 2 | Whitelist Unauthorized Screen | R1 | 5 | 5 | ✓ | ✓ |
| 3 | Auto-Binding Invite Trigger | SRS §6, Piano §2.2 | 5 | 5 | ✓ | ✓ |
| 4 | Studio Projects Management | R2 | 5 | 5 | ✓ | ✓ |
| 5 | Project Invitations & Membership | R2 | 5 | 5 | ✓ | ✓ |
| 6 | Database Schema & Data Models | SRS §6, Piano §2.1 | 5 | 5 | ✓ | ✓ |
| 7 | Zero Anonymous Access (RLS) | R3 | 5 | 5 | ✓ | ✓ |
| 8 | Project Membership RLS Filtering | R3 | 5 | 5 | ✓ | ✓ |
| 9 | Role Permissions Matrix | R2, SRS §2.3 | 5 | 5 | ✓ | ✓ |
| 10 | 64px Fixed Top Bar (Zero Sidebar) | R4, SRS §3.1 | 5 | 5 | ✓ | ✓ |
| 11 | Adaptive Pill Timer (Auto-Start/Stop) | R4, SRS §5.1 | 5 | 5 | ✓ | ✓ |
| 12 | Manual Time Edit Modal (`✎`) | R4, SRS §5.1 | 5 | 5 | ✓ | ✓ |
| 13 | Weekly Hours & Excluded Average | R4, SRS §5.2 | 5 | 5 | ✓ | ✓ |
| 14 | User Dashboard (70% Active Hero Card) | R4, SRS §4.1 | 5 | 5 | ✓ | ✓ |
| 15 | User Dashboard (30% Priority Queue) | R4, SRS §4.1 | 5 | 5 | ✓ | ✓ |
| 16 | Admin Dashboard (Team 3x2 Grid) | R4, SRS §4.2 | 5 | 5 | ✓ | ✓ |
| 17 | Admin Dashboard (Orphan Backlog) | R4, SRS §4.2 | 5 | 5 | ✓ | ✓ |
| 18 | Kanban Full-Width Board | R4, SRS §4.3 | 5 | 5 | ✓ | ✓ |
| 19 | Gantt Timeline View | R4, SRS §4.4 | 5 | 5 | ✓ | ✓ |
| 20 | Optimistic UI Updates | R4, SRS §1.2 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Runner**: Vitest (`npm.cmd test` / `npm.cmd run test:run`)
- **Environment**: jsdom with `@testing-library/react` and `@testing-library/user-event`
- **Location**:
  - `tests/unit/`: Business logic, time calculations, RLS simulation, auth tokens.
  - `tests/integration/`: Multi-project isolation, role transitions, timer sync.
  - `tests/e2e/`: Full opaque-box user flows (Tier 1-4).
- **Pass/Fail Semantics**: 100% test pass required (exit code 0).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Studio Artist Daily Workflow: Login with whitelisted Google account, select project, click 'Avvia Timer' on 'Non iniziata' task (auto-status change to 'In corso'), check off 3 subtasks, add blocker note, switch status to 'Bloccato' (auto-stop timer), and verify time logged. | F1, F5, F10, F11, F14, F15, F20 | High |
| 2 | Lead Producer Project Setup: Admin logs in, creates new project 'ArtLake Studio Alpha', invites 3 artists by email, creates 5 tasks, assigns 4 and leaves 1 orphan; confirms orphan badge on Admin Dashboard. | F1, F4, F5, F9, F16, F17 | High |
| 3 | Unauthorized Security Intrusion Attempt: Uninvited Google account logs in; verified that only 'Account non autorizzato' screen appears with Logout button; direct mock DB queries without membership return 0 rows. | F1, F2, F7, F8, F9 | High |
| 4 | Weekly Hours Audit & Rectification: Artist forgets timer on overnight, opens manual modal (`✎`), rectifies to 2h 30m, and checks Top Bar weekly sum and historical average (verifying current week is excluded from average). | F10, F11, F12, F13, F20 | Medium |
| 5 | Cross-View Real-Time Sync: Artist moves task in Kanban from 'In revisione' to 'Completata'; navigates to Gantt and User Dashboard, confirming status, progress, and queue update immediately. | F10, F14, F18, F19, F20 | High |
| 6 | Atomic Optimistic Task Switch: Artist working on Task A with timer running clicks 'Passa a questa task →' on Task B in queue; verifies Task A timer auto-stops and logs duration, Task B becomes active hero, and queue reorders with 0ms perceived latency. | F11, F14, F15, F20 | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥5 test cases per feature (≥100 tests).
- **Tier 2 (Boundary & Corner Cases)**: ≥5 test cases per feature (≥100 tests).
- **Tier 3 (Cross-Feature Combinations)**: Pairwise coverage across major interactions (≥20 tests).
- **Tier 4 (Real-World Scenarios)**: 6 comprehensive end-to-end user journeys.
