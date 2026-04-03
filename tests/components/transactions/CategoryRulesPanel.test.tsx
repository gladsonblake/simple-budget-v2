import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils'
import CategoryRulesPanel from '@/app/transactions/CategoryRulesPanel'
import type { CategoryRule, Category } from '@/lib/types'

vi.mock('@/lib/db', () => ({
  saveCategoryRules: vi.fn().mockResolvedValue(undefined),
}))

const rules: CategoryRule[] = [
  { id: 1, pattern: 'NETFLIX', category: 'Entertainment', priority: 0 },
  { id: 2, pattern: 'HULU', category: 'Entertainment', priority: 1 },
  { id: 3, pattern: 'WALMART', category: 'Groceries', priority: 2 },
]

const categories: Category[] = [
  { id: 1, name: 'Entertainment' },
  { id: 2, name: 'Groceries' },
]

const onChange = vi.fn()

beforeEach(() => { vi.clearAllMocks() })

describe('CategoryRulesPanel', () => {
  it('renders existing rule patterns as chips grouped by category', () => {
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.getByText('NETFLIX')).toBeInTheDocument()
    expect(screen.getByText('HULU')).toBeInTheDocument()
    expect(screen.getByText('WALMART')).toBeInTheDocument()
    // Category group headers (also appear in the select dropdown)
    expect(screen.getAllByText('Entertainment').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Groceries').length).toBeGreaterThanOrEqual(1)
  })

  it('renders category select for adding new rules', () => {
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    )
    // The "add new rule" row has a category select
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('adds a new rule when pattern and category are provided', () => {
    render(
      <CategoryRulesPanel
        rules={[]}
        categories={categories}
        onChange={onChange}
      />
    )
    const patternInput = screen.getByPlaceholderText(/pattern/i)
    fireEvent.change(patternInput, { target: { value: 'DISNEY' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Entertainment' } })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('DISNEY')).toBeInTheDocument()
    expect(screen.getAllByText('Entertainment').length).toBeGreaterThanOrEqual(1)
  })

  it('shows rule count', () => {
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.getByText('(3)')).toBeInTheDocument()
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

  it('shows empty state when no rules exist', () => {
    render(
      <CategoryRulesPanel
        rules={[]}
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.getByText(/no rules yet/i)).toBeInTheDocument()
  })
})
