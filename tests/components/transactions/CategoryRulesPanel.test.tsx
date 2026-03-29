import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils'
import CategoryRulesPanel from '@/app/transactions/CategoryRulesPanel'
import type { CategoryRule, Category } from '@/lib/types'

vi.mock('@/lib/db', () => ({
  saveCategoryRules: vi.fn().mockResolvedValue(undefined),
  renameCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue({}),
}))

const rules: CategoryRule[] = [
  { id: 1, pattern: 'NETFLIX', category: 'Entertainment', priority: 0 },
]

const categories: Category[] = [
  { id: 1, name: 'Entertainment' },
  { id: 2, name: 'Groceries' },
]

const onChange = vi.fn()
const onAddCategory = vi.fn().mockResolvedValue({ id: 3, name: 'Transport' })

beforeEach(() => { vi.clearAllMocks() })

describe('CategoryRulesPanel', () => {
  it('renders existing rule patterns', () => {
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
        onAddCategory={onAddCategory}
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
        onAddCategory={onAddCategory}
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
        onAddCategory={onAddCategory}
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
        onAddCategory={onAddCategory}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /save rules/i }))
    await waitFor(() => expect(saveCategoryRules).toHaveBeenCalled())
    expect(onChange).toHaveBeenCalled()
  })

  it('renders all categories in the management section', () => {
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
        onAddCategory={onAddCategory}
      />
    )
    expect(screen.getAllByText('Entertainment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0)
  })

  it('calls deleteCategory and onChange when a delete button is clicked', async () => {
    const { deleteCategory } = await import('@/lib/db')
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
        onAddCategory={onAddCategory}
      />
    )
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith(1))
    expect(onChange).toHaveBeenCalled()
  })

  it('shows an error message when deleteCategory returns an error', async () => {
    const { deleteCategory } = await import('@/lib/db')
    ;(deleteCategory as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: '1 rule uses this category',
    })
    render(
      <CategoryRulesPanel
        rules={rules}
        categories={categories}
        onChange={onChange}
        onAddCategory={onAddCategory}
      />
    )
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    await waitFor(() =>
      expect(screen.getByText('1 rule uses this category')).toBeInTheDocument()
    )
  })
})
