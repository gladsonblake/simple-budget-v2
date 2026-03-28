---
name: frontend-tdd
description: TDD workflow for frontend React/Next.js development using Vitest + React Testing Library. Use this skill whenever implementing, modifying, or extending any frontend code — components, pages, forms, interactive elements, or UI behavior. This applies even for small changes like "add a button", "show an error state", or "make this clickable". Always write failing tests FIRST, place them in `tests/components/` or `tests/unit/`, and follow a strict red → green → refactor cycle before writing any implementation code.
---

# Frontend TDD with Vitest + React Testing Library

When implementing any frontend feature, the order is always: **tests first, then implementation**.

This discipline pays off: writing tests before the code forces you to think about what a component *should do* from the user's perspective before getting caught up in implementation. You design the interface by using it. The resulting components tend to have cleaner APIs, better accessibility, and fewer regressions.

## The Cycle

**Red → Green → Refactor**

1. Write failing tests that describe the desired behavior
2. Run them to confirm they fail (expected — the component doesn't exist yet)
3. Write the minimum implementation to make them pass
4. Refactor if needed, keeping tests green

## Test Layer Summary

| Layer | Tool | Location | Extension | When to use |
|---|---|---|---|---|
| Unit | Vitest | `tests/unit/` | `.test.ts` | Pure logic, utilities, helpers |
| Component | Vitest + RTL | `tests/components/` | `.test.tsx` | React components and pages |
| E2E | Playwright | `tests/e2e/` | `.spec.ts` | Full browser flows |

For component and unit tests, run: `npm run test:run`
For E2E tests, run: `npm run test:e2e`

## Test File Location

Component and unit tests go in their respective flat directories under `tests/`:

```
src/
  app/
    dashboard/
      page.tsx
      BudgetCard.tsx
tests/
  unit/           # pure logic, no React
  components/     # React components and pages
    dashboard.test.tsx
    BudgetCard.test.tsx
  e2e/
    smoke.spec.ts
```

## Writing Component Tests

Import from `../utils` (the custom render wrapper) rather than RTL directly:

```typescript
import { render, screen } from '../utils'
```

This wrapper is ready for providers (context, state management) as the app grows.

### Query priority

Test from the user's perspective using accessible queries (in this order):

1. `screen.getByRole('button', { name: 'Save' })` — preferred
2. `screen.getByLabelText('Email address')` — great for form fields
3. `screen.getByText('Welcome back')` — fine for text content
4. `screen.getByTestId('thing')` — last resort only

Avoid selecting by CSS class or internal state — these test implementation, not behavior.

### What to cover

For each component, write tests for:

- **Renders correctly** — key visible elements appear with expected content
- **User interactions** — clicks, inputs, keyboard navigation produce correct results
- **State transitions** — loading indicators, error messages, empty states appear when they should
- **Edge cases** — missing/empty data, boundary values, invalid input
- **Accessibility** — interactive elements have roles and labels; keyboard users can reach them

Skip pure presentational components with no logic (a static `<Logo />`, a `<Divider />`). One smoke test is fine for those.

### Example: component with logic

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '../utils'
import { BudgetCard } from '@/app/dashboard/BudgetCard'

describe('BudgetCard', () => {
  it('renders category name and amount', () => {
    render(<BudgetCard category="Groceries" spent={250} budget={300} />)
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('$250')).toBeInTheDocument()
    expect(screen.getByText('$300')).toBeInTheDocument()
  })

  it('shows over-budget warning when spending exceeds budget', () => {
    render(<BudgetCard category="Dining" spent={400} budget={300} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/over budget/i)).toBeInTheDocument()
  })

  it('does not show warning when within budget', () => {
    render(<BudgetCard category="Dining" spent={200} budget={300} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn()
    render(<BudgetCard category="Groceries" spent={250} budget={300} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledOnce()
  })
})
```

### Example: page-level rendering

For pages, test the key content and interactions rendered for the user:

```typescript
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

### Example: unit test (no React)

Pure logic lives in `tests/unit/` with a `.test.ts` extension:

```typescript
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/lib/format'

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(47.5)).toBe('$47.50')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
})
```

## next/navigation

`useRouter`, `usePathname`, `redirect`, and friends are mocked globally in `tests/setup.ts`. Component tests that call these will get stub implementations automatically — no per-test setup needed.

## The Implementation Step

After tests are written and confirmed failing:

- Write the **minimum code** to make tests pass — don't add features the tests don't specify
- Once green, refactor freely — the tests are your safety net
- If you realize you need additional behavior, write a test for it first

## Scope

Every UI change gets tests. The only exception is purely visual, logic-free components (static icons, layout dividers, decorative elements) — a single smoke test or no test is fine there.

E2E tests (`tests/e2e/`) are reserved for cross-route user flows. Don't duplicate component-level assertions in E2E tests.
