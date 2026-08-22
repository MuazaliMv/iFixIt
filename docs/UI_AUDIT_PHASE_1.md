# FixIt UI Audit — Phase 1

## Scope
Baseline inventory of the current Next.js App Router UI before consolidation. Production rollback is preserved separately; all work in this phase is isolated to `ui/unified-audit-phase-1`.

## Current screen groups

### Customer / shared
- `/`
- `/requests`
- `/requests/[ticket]`
- `/messages`
- `/messages/[ticket]`
- `/profile`
- `/login`
- `/forgot-password`
- `/reset-password`

### Provider
- `/provider`
- `/provider/today`
- `/provider/jobs`
- `/provider/jobs/[ticket]`
- `/provider/messages`
- `/provider/calendar`
- `/provider/availability`
- `/provider/services`
- `/provider/listings`
- `/provider/completion-photos`
- `/provider/earnings`
- `/provider/subscription`
- `/provider/onboarding`
- `/provider/setup`
- `/provider/menu`

### Admin
- `/admin`
- `/admin/requests`
- `/admin/providers`
- `/admin/providers/[userId]`
- `/admin/providers/[userId]/documents`
- `/admin/users`
- `/admin/services`
- `/admin/locations`
- `/admin/required-fields`
- `/admin/escalations`
- `/admin/reports`
- `/admin/settings`
- `/admin/audit-logs`
- `/admin/audit-logs/examples`

## High-priority findings

### P0/P1 architecture risk: cumulative CSS generations
The root layout currently loads many global CSS generations and override layers. This makes component behavior dependent on import order and increases the risk that one screen fix changes another screen unexpectedly.

Current layers include global, compatibility, reference, iPhone audit, account polish, E2E hardening, final polish, request-detail v3, Airbnb theme, global buttons, blue accent, and dual-mode styles.

**Decision:** do not remove any legacy stylesheet until affected routes are migrated. Introduce canonical design tokens first and progressively move components to them.

### P1: navigation and mode behavior is fragmented
Navigation/mode responsibilities are spread across `RouteMobileNav`, `MobileNav`, `GlobalModeSwitch`, `AppModeSwitch`, `ModeToast`, `CustomerHeader`, `CustomerSidebar`, provider menu pages, and admin navigation.

**Target:** one role-aware app shell per role, backed by shared primitives and a single route/navigation configuration.

### P1: request/job detail duplication
Customer request detail and provider job detail are separate large implementations while both represent the same underlying service lifecycle.

**Target:** shared lifecycle primitives (status mapping, timeline, summary, next action, messages, estimate/work sections) with role-specific actions layered on top.

### P1: multiple provider operational destinations
`today`, `jobs`, `calendar`, `availability`, `completion-photos`, `listings`, `services`, and `menu` create a large navigation surface.

**Target:** retain distinct data capabilities, but consolidate navigation around Dashboard, Leads/Jobs, Messages, Performance, and Profile/Settings; move secondary operational tools into appropriate sections.

## Canonical design foundation introduced
`app/design-system.css` now defines initial semantic tokens for:
- primary/background/surface/text/border colors
- success/warning/danger/info states
- 4/8/12/16/24/32/48/64 spacing
- radii
- shadows
- typography sizes
- accessible focus treatment
- common surface/status primitives

This foundation is intentionally non-destructive and does not override legacy screens globally.

## Migration order
1. Shared status model + status badge/timeline primitives.
2. Customer request list/detail.
3. Provider jobs list/detail.
4. Customer/provider navigation shells.
5. Messages and notifications.
6. Admin operational views.
7. Remove proven-dead CSS/components after route-by-route regression testing.

## Rules
- No business function is removed solely because the UI is duplicated.
- Existing database/API behavior must be mapped before component deletion.
- Customer/provider/admin permission boundaries remain enforced by backend/RLS, not only visibility.
- Each migration must pass build/typecheck and happy-path tests before merge/deploy.
