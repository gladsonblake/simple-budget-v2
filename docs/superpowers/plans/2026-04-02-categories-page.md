# Categories Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-CRUD Categories page and remove category creation from the transactions page, making the category rules panel a pure rule editor with a read-only dropdown.

**Architecture:** Three independent changes: (1) simplify `CategorySelect` to a pure dropdown, (2) strip the categories management section from `CategoryRulesPanel`, (3) build the Categories page. Each change has its own test update followed by implementation, committed separately.

**Tech Stack:** Next.js 16, React 19, Vitest + React Testing Library, SQLite via `@tauri-apps/plugin-sql` (mocked in tests via `tests/setup.ts`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `tests/components/transactions/CategorySelect.test.tsx` | Modify | Remove add-new tests, remove `onAddCategory` prop from renders |
| `src/app/transactions/CategorySelect.tsx` | Modify | Remove inline-add state, remove `onAddCategory` prop |
| `tests/components/transactions/CategoryRulesPanel.test.tsx` | Modify | Remove categories-management tests, remove `onAddCategory` |
| `src/app/transactions/CategoryRulesPanel.tsx` | Modify | Remove categories section and `onAddCategory` prop |
| `src/app/transactions/page.tsx` | Modify | Remove `handleAddCategory`, remove `onAddCategory` prop |
| `tests/components/categories/CategoriesPage.test.tsx` | Create | Full CRUD tests for the new page |
| `src/app/categories/page.tsx` | Rewrite | Full CRUD categories page |

---

## Task 1: Simplify CategorySelect

### Files:
- Modify: `tests/components/transactions/CategorySelect.test.tsx`
- Modify: `src/app/transactions/CategorySelect.tsx`

- [ ] **Step 1: Update the test file**

Replace the entire contents of `tests/components/transactions/CategorySelect.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../utils'
import CategorySelect from '@/app/transactions/CategorySelect'
import type { Category } from '@/lib/types'

const categories: Category[] = [
  { id: 1, name: 'Entertainment' },
  { id: 2, name: 'Groceries' },
]

const onChange = vi.fn()

beforeEach(() => { vi.clearAllMocks() })

describe('CategorySelect', () => {
  it('renders a select populated with the provided categories', () => {
    render(
      <CategorySelect
        value="Entertainment"
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.getByDisplayValue('Entertainment')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('calls onChange when a different option is selected', () => {
    render(
      <CategorySelect
        value="Entertainment"
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Groceries' } })
    expect(onChange).toHaveBeenCalledWith('Groceries')
  })

  it('does not show an add-new option', () => {
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.queryByText(/add new category/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/transactions/CategorySelect.test.tsx
```

Expected: FAIL — the existing component still has `onAddCategory` in its Props and the add-new option still exists.

- [ ] **Step 3: Rewrite CategorySelect**

Replace the entire contents of `src/app/transactions/CategorySelect.tsx`:

```tsx
'use client'
import type { Category } from '@/lib/types'

interface Props {
  value: string
  categories: Category[]
  onChange: (value: string) => void
}

export default function CategorySelect({ value, categories, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
    >
      <option value="">— select —</option>
      {categories.map(c => (
        <option key={c.id} value={c.name}>{c.name}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/transactions/CategorySelect.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/components/transactions/CategorySelect.test.tsx src/app/transactions/CategorySelect.tsx
git commit -m "feat: simplify CategorySelect to pure dropdown, remove inline add"
```

---

## Task 2: Strip categories management from CategoryRulesPanel

### Files:
- Modify: `tests/components/transactions/CategoryRulesPanel.test.tsx`
- Modify: `src/app/transactions/CategoryRulesPanel.tsx`
- Modify: `src/app/transactions/page.tsx`

- [ ] **Step 1: Update CategoryRulesPanel tests**

Replace the entire contents of `tests/components/transactions/CategoryRulesPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils'
import CategoryRulesPanel from '@/app/transactions/CategoryRulesPanel'
import type { CategoryRule, Category } from '@/lib/types'

vi.mock('@/lib/db', () => ({
  saveCategoryRules: vi.fn().mockResolvedValue(undefined),
}))

const rules: CategoryRule[] = [
  { id: 1, pattern: 'NETFLIX', category: 'Entertainment', priority: 0 },
]

const categories: Category[] = [
  { id: 1, name: 'Entertainment' },
  { id: 2, name: 'Groceries' },
]

const onChange = vi.fn()

beforeEach(() => { vi.clearAllMocks() })

describe('CategoryRulesPanel', () => {
  it('renders existing rule patterns', () => {
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.getByDisplayValue('NETFLIX')).toBeInTheDocument()
  })

  it('renders category as a select (not a free-form input) for each rule', () => {
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Entertainment')).toBeInTheDocument()
  })

  it('adds a new empty rule when Add Rule is clicked', () => {
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    const patternInputs = screen.getAllByPlaceholderText(/pattern/i)
    expect(patternInputs).toHaveLength(2)
  })

  it('calls onChange after saving rules', async () => {
    const { saveCategoryRules } = await import('@/lib/db')
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /save rules/i }))
    await waitFor(() => expect(saveCategoryRules).toHaveBeenCalled())
    expect(onChange).toHaveBeenCalled()
  })

  it('does not render a categories management section', () => {
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /rename/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/transactions/CategoryRulesPanel.test.tsx
```

Expected: FAIL — the component still has `onAddCategory` in Props (TypeScript error) and still renders the categories management section.

- [ ] **Step 3: Update CategoryRulesPanel**

Replace the entire contents of `src/app/transactions/CategoryRulesPanel.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { saveCategoryRules } from '@/lib/db'
import type { CategoryRule, Category } from '@/lib/types'
import CategorySelect from './CategorySelect'

type DraftRule = Omit<CategoryRule, 'id'>

interface Props {
  rules: CategoryRule[]
  categories: Category[]
  onChange: () => void
}

export default function CategoryRulesPanel({ rules, categories, onChange }: Props) {
  const [drafts, setDrafts] = useState<DraftRule[]>(
    rules.map(r => ({ pattern: r.pattern, category: r.category, priority: r.priority }))
  )
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setDrafts(rules.map(r => ({ pattern: r.pattern, category: r.category, priority: r.priority })))
  }, [rules])

  function addRule() {
    setDrafts(d => [...d, { pattern: '', category: '', priority: d.length }])
  }

  function removeRule(i: number) {
    setDrafts(d => d.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, priority: idx })))
  }

  function updatePattern(i: number, value: string) {
    setDrafts(d => d.map((r, idx) => idx === i ? { ...r, pattern: value } : r))
  }

  function updateCategory(i: number, value: string) {
    setDrafts(d => d.map((r, idx) => idx === i ? { ...r, category: value } : r))
  }

  async function handleSave() {
    setSaveError(null)
    try {
      const valid = drafts.filter(r => r.pattern.trim() && r.category.trim())
      await saveCategoryRules(valid)
      onChange()
    } catch {
      setSaveError('Failed to save rules')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Category Rules</h2>
          <button
            onClick={addRule}
            className="text-xs font-medium text-gray-600 border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
          >
            Add Rule
          </button>
        </div>
        {drafts.length === 0 && (
          <p className="text-xs text-gray-400">No rules yet. Add one to auto-categorize transactions.</p>
        )}
        {drafts.map((rule, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Pattern (e.g. NETFLIX)"
              value={rule.pattern}
              onChange={e => updatePattern(i, e.target.value)}
              className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <span className="text-xs text-gray-400">→</span>
            <CategorySelect
              value={rule.category}
              categories={categories}
              onChange={v => updateCategory(i, v)}
            />
            <button
              onClick={() => removeRule(i)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={handleSave}
          className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
        >
          Save Rules
        </button>
        {saveError && <p className="text-xs text-red-500 mt-1">{saveError}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update TransactionsPage**

Replace the entire contents of `src/app/transactions/page.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { getTransactions, getCategoryRules, getCategories } from '@/lib/db'
import { effectiveCategory } from '@/lib/rules'
import type { Transaction, CategoryRule, Category } from '@/lib/types'
import CategoryRulesPanel from './CategoryRulesPanel'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showRules, setShowRules] = useState(false)

  async function load() {
    const [txns, rls, cats] = await Promise.all([
      getTransactions(),
      getCategoryRules(),
      getCategories(),
    ])
    setTransactions(txns)
    setRules(rls)
    setCategories(cats)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowRules(r => !r)}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {showRules ? 'Hide Rules' : 'Category Rules'}
        </button>
      </div>

      {showRules && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 max-w-xl">
          <CategoryRulesPanel
            rules={rules}
            categories={categories}
            onChange={load}
          />
        </div>
      )}

      {transactions.length === 0 ? (
        <p className="text-sm text-gray-400">No transactions yet. Import a CSV to get started.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Memo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{t.description}</td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                    {t.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.transaction_type ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {effectiveCategory(t.category, t.description, rules) ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{t.memo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/components/transactions/CategoryRulesPanel.test.tsx
```

Expected: PASS (5 tests)

- [ ] **Step 6: Run all tests to verify no regressions**

```bash
npm run test:run
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add tests/components/transactions/CategoryRulesPanel.test.tsx \
        src/app/transactions/CategoryRulesPanel.tsx \
        src/app/transactions/page.tsx
git commit -m "feat: remove category management from transactions page"
```

---

## Task 3: Build the Categories page

### Files:
- Create: `tests/components/categories/CategoriesPage.test.tsx`
- Rewrite: `src/app/categories/page.tsx`

- [ ] **Step 1: Create the test file**

Create `tests/components/categories/CategoriesPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils'
import CategoriesPage from '@/app/categories/page'

vi.mock('@/lib/db', () => ({
  getCategories: vi.fn().mockResolvedValue([
    { id: 1, name: 'Entertainment' },
    { id: 2, name: 'Groceries' },
  ]),
  addCategory: vi.fn().mockResolvedValue({ id: 3, name: 'Transport' }),
  renameCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue({}),
}))

beforeEach(() => { vi.clearAllMocks() })

describe('CategoriesPage', () => {
  it('renders existing categories on load', async () => {
    render(<CategoriesPage />)
    expect(await screen.findByText('Entertainment')).toBeInTheDocument()
    expect(screen.getByText('Groceries')).toBeInTheDocument()
  })

  it('calls addCategory when Add is clicked with a non-empty name', async () => {
    const { addCategory } = await import('@/lib/db')
    render(<CategoriesPage />)
    await screen.findByText('Entertainment')
    fireEvent.change(screen.getByLabelText(/new category name/i), {
      target: { value: 'Transport' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    await waitFor(() => expect(addCategory).toHaveBeenCalledWith('Transport'))
  })

  it('clears the input after a successful add', async () => {
    render(<CategoriesPage />)
    await screen.findByText('Entertainment')
    const input = screen.getByLabelText(/new category name/i)
    fireEvent.change(input, { target: { value: 'Transport' } })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('shows "Category already exists" when addCategory throws', async () => {
    const { addCategory } = await import('@/lib/db')
    ;(addCategory as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('UNIQUE constraint failed')
    )
    render(<CategoriesPage />)
    await screen.findByText('Entertainment')
    fireEvent.change(screen.getByLabelText(/new category name/i), {
      target: { value: 'Entertainment' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    await waitFor(() =>
      expect(screen.getByText('Category already exists')).toBeInTheDocument()
    )
  })

  it('shows inline rename input when Rename is clicked', async () => {
    render(<CategoriesPage />)
    await screen.findByText('Entertainment')
    fireEvent.click(screen.getByRole('button', { name: /rename entertainment/i }))
    expect(screen.getByLabelText(/rename category/i)).toBeInTheDocument()
  })

  it('calls renameCategory with correct args when Save is clicked', async () => {
    const { renameCategory } = await import('@/lib/db')
    render(<CategoriesPage />)
    await screen.findByText('Entertainment')
    fireEvent.click(screen.getByRole('button', { name: /rename entertainment/i }))
    fireEvent.change(screen.getByLabelText(/rename category/i), {
      target: { value: 'Fun' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(renameCategory).toHaveBeenCalledWith(1, 'Fun'))
  })

  it('cancels rename and restores the list item when ✕ is clicked', async () => {
    render(<CategoriesPage />)
    await screen.findByText('Entertainment')
    fireEvent.click(screen.getByRole('button', { name: /rename entertainment/i }))
    expect(screen.getByLabelText(/rename category/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByLabelText(/rename category/i)).not.toBeInTheDocument()
    expect(screen.getByText('Entertainment')).toBeInTheDocument()
  })

  it('calls deleteCategory with correct id when Delete is clicked', async () => {
    const { deleteCategory } = await import('@/lib/db')
    render(<CategoriesPage />)
    await screen.findByText('Entertainment')
    fireEvent.click(screen.getByRole('button', { name: /delete entertainment/i }))
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith(1))
  })

  it('shows an error when deleteCategory returns an error string', async () => {
    const { deleteCategory } = await import('@/lib/db')
    ;(deleteCategory as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: '1 rule uses this category',
    })
    render(<CategoriesPage />)
    await screen.findByText('Entertainment')
    fireEvent.click(screen.getByRole('button', { name: /delete entertainment/i }))
    await waitFor(() =>
      expect(screen.getByText('1 rule uses this category')).toBeInTheDocument()
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/categories/CategoriesPage.test.tsx
```

Expected: FAIL — the current Categories page is a stub with no interactivity.

- [ ] **Step 3: Implement the Categories page**

Replace the entire contents of `src/app/categories/page.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { getCategories, addCategory, renameCategory, deleteCategory } from '@/lib/db'
import type { Category } from '@/lib/types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<number | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function load() {
    setCategories(await getCategories())
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setAddError(null)
    try {
      await addCategory(trimmed)
      setNewName('')
      await load()
    } catch {
      setAddError('Category already exists')
    }
  }

  async function handleRenameConfirm(id: number) {
    const trimmed = renameName.trim()
    if (!trimmed) return
    setRenameError(null)
    try {
      await renameCategory(id, trimmed)
      setRenameId(null)
      await load()
    } catch {
      setRenameError('Failed to rename category')
    }
  }

  async function handleDelete(id: number) {
    setDeleteError(null)
    try {
      const result = await deleteCategory(id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        await load()
      }
    } catch {
      setDeleteError('Failed to delete category')
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Categories</h1>

      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder="New category name"
          aria-label="New category name"
          className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
        >
          Add
        </button>
      </div>
      {addError && <p className="text-xs text-red-500 mb-4">{addError}</p>}

      {deleteError && <p className="text-xs text-red-600 mb-2 mt-4">{deleteError}</p>}

      {categories.length === 0 && !addError && (
        <p className="text-sm text-gray-400 mt-4">No categories yet. Add one above.</p>
      )}

      <ul className="space-y-1 mt-4">
        {categories.map(cat => (
          <li key={cat.id} className="flex items-center gap-2">
            {renameId === cat.id ? (
              <>
                <input
                  type="text"
                  value={renameName}
                  onChange={e => setRenameName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(cat.id) }}
                  autoFocus
                  aria-label="Rename category"
                  className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button
                  onClick={() => handleRenameConfirm(cat.id)}
                  className="text-xs font-medium text-white bg-gray-900 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { setRenameId(null); setRenameError(null) }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
                {renameError && <p className="text-xs text-red-500">{renameError}</p>}
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                <button
                  onClick={() => { setRenameId(cat.id); setRenameName(cat.name); setDeleteError(null) }}
                  aria-label={`Rename ${cat.name}`}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  aria-label={`Delete ${cat.name}`}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/categories/CategoriesPage.test.tsx
```

Expected: PASS (8 tests)

- [ ] **Step 5: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add tests/components/categories/CategoriesPage.test.tsx src/app/categories/page.tsx
git commit -m "feat: build Categories page with full CRUD"
```
