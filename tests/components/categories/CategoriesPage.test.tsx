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

  it('hides the rename input after a successful rename', async () => {
    render(<CategoriesPage />)
    await screen.findByText('Entertainment')
    fireEvent.click(screen.getByRole('button', { name: /rename entertainment/i }))
    fireEvent.change(screen.getByLabelText(/rename category/i), {
      target: { value: 'Fun' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(screen.queryByLabelText(/rename category/i)).not.toBeInTheDocument()
    })
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
