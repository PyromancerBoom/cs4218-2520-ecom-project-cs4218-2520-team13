---
name: Admin Component Test Instrumentation State
description: Production source files have zero data-testid attributes; all data-testid usage is confined to test mocks only
type: project
---

No `data-testid` attributes exist in any production React source files (client/src/pages/, client/src/components/). All `data-testid` values found in the codebase are injected via Jest mock overrides in test files only.

**Why:** The project was built without test instrumentation in mind for E2E/Playwright testing. Unit tests mock entire components and inject their own testids.

**How to apply:** When providing Playwright selectors, rely on aria-label, placeholder text, button text content, CSS class names (Bootstrap), and HTML element types/roles. Recommend adding data-testid attributes to source files when suggesting improvements. Both `client/src/pages/Admin/` (capital A) and `client/src/pages/admin/` (lowercase a) directories exist — the lowercase one appears to be the active/current version used by the running app.
