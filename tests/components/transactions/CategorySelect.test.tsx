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
  it('renders a button showing the current category value', () => {
    render(
      <CategorySelect
        value="Entertainment"
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.getByRole('button', { name: 'Entertainment' })).toBeInTheDocument()
  })

  it('opens a dropdown with category options when clicked', () => {
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByLabelText('Category search')).toBeInTheDocument()
    expect(screen.getByText('Entertainment')).toBeInTheDocument()
    expect(screen.getByText('Groceries')).toBeInTheDocument()
  })

  it('calls onChange when an existing category is selected', () => {
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Groceries'))
    expect(onChange).toHaveBeenCalledWith('Groceries')
  })

  it('shows a create option when typing a new category name', () => {
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByLabelText('Category search'), { target: { value: 'Travel' } })
    expect(screen.getByText(/Create/)).toBeInTheDocument()
    expect(screen.getByText(/Travel/)).toBeInTheDocument()
  })

  it('calls onChange with new category name when create option is clicked', () => {
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByLabelText('Category search'), { target: { value: 'Travel' } })
    fireEvent.click(screen.getByText(/Create/))
    expect(onChange).toHaveBeenCalledWith('Travel')
  })

  it('filters existing categories as user types', () => {
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByLabelText('Category search'), { target: { value: 'Ent' } })
    expect(screen.getByText('Entertainment')).toBeInTheDocument()
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
  })

  it('does not show create option when query matches existing category', () => {
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByLabelText('Category search'), { target: { value: 'entertainment' } })
    expect(screen.queryByText(/Create/)).not.toBeInTheDocument()
  })

  it('shows placeholder text when no value is set', () => {
    render(
      <CategorySelect
        value=""
        placeholder="Auto: Food"
        categories={categories}
        onChange={onChange}
      />
    )
    expect(screen.getByText('Auto: Food')).toBeInTheDocument()
  })

  it('shows clear option when a value is set and dropdown is open', () => {
    render(
      <CategorySelect
        value="Entertainment"
        categories={categories}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Entertainment' }))
    fireEvent.click(screen.getByText(/clear category/))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
