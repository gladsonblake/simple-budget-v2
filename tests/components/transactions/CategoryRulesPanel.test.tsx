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
