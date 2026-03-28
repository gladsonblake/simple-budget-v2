# Testing Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Vitest + React Testing Library for unit/component tests and Playwright for E2E tests against the Next.js dev server.

**Architecture:** Two independent test layers — Vitest handles fast, isolated unit and component tests using jsdom; Playwright handles full browser E2E tests by auto-starting the Next.js dev server. Both output to a top-level `tests/` directory.

**Tech Stack:** Vitest, @vitejs/plugin-react, vite-tsconfig-paths, jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, @vitest/coverage-v8, @playwright/test

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Add test scripts |
| `vitest.config.ts` | Create | Vitest configuration |
| `playwright.config.ts` | Create | Playwright configuration |
| `tests/setup.ts` | Create | Vitest global setup: jest-dom + next/navigation mock |
| `tests/utils.tsx` | Create | Custom RTL render wrapper |
| `tests/components/dashboard.test.tsx` | Create | Example component test (validates Vitest + RTL setup) |
| `tests/e2e/smoke.spec.ts` | Create | Playwright smoke tests for all routes |
| `.gitignore` | Modify | Ignore Playwright artifacts |

---

### Task 1: Install Vitest layer dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
```

Expected: packages added to `devDependencies` in `package.json`, no errors.

- [ ] **Step 2: Verify installation**

```bash
npx vitest --version
```

Expected: prints a version number like `3.x.x`.

---

### Task 2: Create vitest.config.ts

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Create the file**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/components/**/*.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
    },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add vitest.config.ts
git commit -m "feat: add vitest config"
```

---

### Task 3: Create tests/setup.ts

**Files:**
- Create: `tests/setup.ts`

- [ ] **Step 1: Create the file**

```ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))
```

- [ ] **Step 2: Commit**

```bash
git add tests/setup.ts
git commit -m "feat: add vitest global setup with jest-dom and next/navigation mock"
```

---

### Task 4: Create tests/utils.tsx

**Files:**
- Create: `tests/utils.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'

function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { ...options })
}

export * from '@testing-library/react'
export { customRender as render }
```

- [ ] **Step 2: Commit**

```bash
git add tests/utils.tsx
git commit -m "feat: add custom RTL render wrapper"
```

---

### Task 5: Write component test and verify Vitest works

**Files:**
- Create: `tests/components/dashboard.test.tsx`

- [ ] **Step 1: Create the test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '../utils'
import DashboardPage from '@/app/dashboard/page'

describe('DashboardPage', () => {
  it('renders the dashboard heading', () => {
    render(<DashboardPage />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Add test scripts to package.json**

Open `package.json` and add to the `"scripts"` section:

```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

Final scripts section should look like:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "tauri": "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

- [ ] **Step 3: Run the test and verify it passes**

```bash
npm run test:run
```

Expected output:
```
✓ tests/components/dashboard.test.tsx (1)
  ✓ DashboardPage > renders the dashboard heading

Test Files  1 passed (1)
Tests       1 passed (1)
```

If it fails, check:
- `@/app/dashboard/page` import: `vite-tsconfig-paths` reads your `tsconfig.json` for the `@/` alias. Verify `tsconfig.json` has `"paths": { "@/*": ["./src/*"] }`. If it doesn't, add it under `compilerOptions`.
- `toBeInTheDocument` not found: means `tests/setup.ts` isn't loading — check the `setupFiles` path in `vitest.config.ts` is exactly `'tests/setup.ts'`.

- [ ] **Step 4: Commit**

```bash
git add tests/components/dashboard.test.tsx package.json
git commit -m "feat: add example component test and vitest scripts"
```

---

### Task 6: Install Playwright and create playwright.config.ts

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install @playwright/test**

```bash
npm install -D @playwright/test
```

Expected: `@playwright/test` added to `devDependencies`.

- [ ] **Step 2: Install Playwright browsers (Chromium only)**

```bash
npx playwright install chromium
```

Expected: downloads Chromium browser binary, prints path.

- [ ] **Step 3: Create playwright.config.ts**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/e2e/.playwright',
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 4: Add E2E scripts to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 5: Add playwright artifacts to .gitignore**

Open `.gitignore` and add:

```
# Playwright
tests/e2e/.playwright/
playwright-report/
```

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts package.json .gitignore
git commit -m "feat: add playwright config and scripts"
```

---

### Task 7: Write Playwright smoke tests and verify E2E works

**Files:**
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Create the smoke test**

```ts
import { test, expect } from '@playwright/test'

const routes = ['/dashboard', '/transactions', '/categories', '/import']

for (const route of routes) {
  test(`${route} loads`, async ({ page }) => {
    const response = await page.goto(route)
    expect(response?.status()).toBe(200)
  })
}
```

- [ ] **Step 2: Run the smoke tests**

```bash
npm run test:e2e
```

Expected: Playwright starts the Next.js dev server automatically, runs 4 tests, all pass:

```
Running 4 tests using 1 worker

  ✓  [chromium] › smoke.spec.ts:5:3 › /dashboard loads
  ✓  [chromium] › smoke.spec.ts:5:3 › /transactions loads
  ✓  [chromium] › smoke.spec.ts:5:3 › /categories loads
  ✓  [chromium] › smoke.spec.ts:5:3 › /import loads

  4 passed (Xs)
```

If the webServer fails to start, check:
- Port 3000 is not already in use by another process (`lsof -i :3000`)
- `npm run dev` works on its own before running E2E tests

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "feat: add playwright smoke tests for all routes"
```
