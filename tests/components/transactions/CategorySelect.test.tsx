import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils'
import CategorySelect from '@/app/transactions/CategorySelect'
import type { Category } from '@/lib/types'

const categories: Category[] = [
  { id: 1, name: 'Entertainment' },
  { id: 2, name: 'Groceries' },
]

const onChange = vi.fn()
const onAddCategory = vi.fn()

beforeEach(() => { vi.clearAllMocks() })

describe('CategorySelect', () => {
  it('renders a select populated with the provided categories', () => {
    render(
      <CategorySelect
        value="Entertainment"
        categories={categories}
        onChange={onChange}
        onAddCategory={onAddCategory}
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
        onAddCategory={onAddCategory}
      />
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Groceries' } })
    expect(onChange).toHaveBeenCalledWith('Groceries')
  })

  it('shows an inline input when the "Add new category" option is selected', () => {
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
        onAddCategory={onAddCategory}
      />
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__add_new__' } })
    expect(screen.getByPlaceholderText(/new category name/i)).toBeInTheDocument()
  })

  it('calls onAddCategory and onChange when a new name is confirmed', async () => {
    onAddCategory.mockResolvedValue({ id: 3, name: 'Transport' })
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
        onAddCategory={onAddCategory}
      />
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__add_new__' } })
    fireEvent.change(screen.getByPlaceholderText(/new category name/i), {
      target: { value: 'Transport' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    await waitFor(() => {
      expect(onAddCategory).toHaveBeenCalledWith('Transport')
      expect(onChange).toHaveBeenCalledWith('Transport')
    })
  })

  it('shows an error message when onAddCategory rejects', async () => {
    onAddCategory.mockRejectedValue(new Error('UNIQUE constraint failed'))
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
        onAddCategory={onAddCategory}
      />
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__add_new__' } })
    fireEvent.change(screen.getByPlaceholderText(/new category name/i), {
      target: { value: 'Entertainment' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    await waitFor(() => {
      expect(screen.getByText('Failed to add category')).toBeInTheDocument()
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('returns to the select when the cancel button is clicked during inline add', () => {
    render(
      <CategorySelect
        value=""
        categories={categories}
        onChange={onChange}
        onAddCategory={onAddCategory}
      />
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__add_new__' } })
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/new category name/i)).not.toBeInTheDocument()
  })
})
