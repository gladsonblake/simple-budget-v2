# Testing Framework Design

**Date:** 2026-03-28
**Project:** simple-budget-v2 (Next.js 16 + Tauri v2)

## Overview

Add a testing framework consisting of two layers:

1. **Vitest + React Testing Library** — unit tests and component tests
2. **Playwright** — E2E tests against the Next.js dev server

Tests live in a top-level `tests/` directory. Tauri desktop testing is out of scope; all tests target the web frontend.

---

## Directory Structure

```
tests/
  unit/          # Vitest unit tests (pure logic, utilities)
  components/    # Vitest + RTL component tests
  e2e/           # Playwright E2E tests
    .playwright/ # artifacts: screenshots, traces (gitignored)
  setup.ts       # Vitest global setup: jest-dom + next/navigation mock
  utils.tsx      # Custom RTL render wrapper (ready for future providers)
vitest.config.ts
playwright.config.ts
```

---

## Vitest Configuration

**File:** `vitest.config.ts`

- Plugin: `@vitejs/plugin-react` for JSX/TSX transforms
- Plugin: `vite-tsconfig-paths` for `@/` → `src/` path alias
- Environment: `jsdom` (required for RTL DOM rendering)
- Test globs: `tests/unit/**/*.test.{ts,tsx}` and `tests/components/**/*.test.{ts,tsx}`
- Setup file: `tests/setup.ts`
- Coverage: V8 provider, instruments source files under `src/`

**File:** `tests/setup.ts`

- Imports `@testing-library/jest-dom` to extend Vitest's `expect` with DOM matchers
- Mocks `next/navigation` (provides stub implementations of `useRouter`, `usePathname`, `redirect`, etc.) since these are not available in jsdom

**File:** `tests/utils.tsx`

- Exports a custom `render` function wrapping RTL's `render` with app-level providers
- Currently a passthrough; ready for when context/state management is added

**Scripts:**

| Command | Description |
|---|---|
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Vitest single pass (CI) |
| `npm run test:coverage` | Vitest with V8 coverage report |

---

## Playwright Configuration

**File:** `playwright.config.ts`

- `baseURL`: `http://localhost:3000`
- `testDir`: `tests/e2e`
- `webServer`: runs `npm run dev`, waits for `http://localhost:3000` to be ready before tests start; reuses existing server if already running
- Browser: Chromium only by default (Firefox/WebKit can be added later)
- Artifacts (screenshots, traces) output to `tests/e2e/.playwright/`

**Scripts:**

| Command | Description |
|---|---|
| `npm run test:e2e` | Run all Playwright E2E tests |
| `npm run test:e2e:ui` | Playwright interactive UI mode |

**Example test:** A smoke test verifying each route (`/dashboard`, `/transactions`, `/categories`, `/import`) loads and returns HTTP 200.

---

## Dependencies

### New dev dependencies

**Vitest layer:**
- `vitest`
- `@vitejs/plugin-react`
- `vite-tsconfig-paths`
- `jsdom`
- `@testing-library/react`
- `@testing-library/dom`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `@vitest/coverage-v8`

**Playwright layer:**
- `@playwright/test`

---

## Constraints and Notes

- **Async Server Components:** Vitest does not support async Server Components. This is not a current concern since `output: "export"` means all components are static/client-side.
- **`next/navigation` mocking:** The `redirect()` call in `src/app/page.tsx` and any future `useRouter`/`usePathname` hooks must be mocked in `tests/setup.ts` for component tests to work.
- **Playwright browsers:** Only Chromium is configured initially. The `@playwright/test` package requires browsers to be installed separately via `npx playwright install`.
- **Tauri:** Out of scope. Playwright tests run against the Next.js dev server only, not the compiled desktop app.
