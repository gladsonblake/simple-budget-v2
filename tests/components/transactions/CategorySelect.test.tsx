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
