import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../utils'
import TransactionsPage from '@/app/transactions/page'

vi.mock('@/lib/db', () => ({
  getTransactions: vi.fn().mockResolvedValue([
    {
      id: 1,
      date: '2026-05-01',
      description: 'NETFLIX',
      amount: 19.99,
      transaction_type: 'card',
      memo: null,
      category: 'Entertainment',
      notes: null,
      extra_data: null,
      imported_at: '2026-05-01T00:00:00.000Z',
      profile_id: 1,
    },
  ]),
  getCategoryRules: vi.fn().mockResolvedValue([
    { id: 1, pattern: 'NETFLIX', category: 'Entertainment', priority: 0 },
  ]),
  getCategories: vi.fn().mockResolvedValue([
    { id: 1, name: 'Entertainment' },
    { id: 2, name: 'Groceries' },
  ]),
  updateTransactionCategory: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TransactionsPage', () => {
  it('opens category rules in a modal', async () => {
    render(<TransactionsPage />)

    await screen.findByText('NETFLIX')
    fireEvent.click(screen.getByRole('button', { name: /category rules/i }))

    expect(screen.getByRole('dialog', { name: /category rules/i })).toBeInTheDocument()
  })

  it('closes the category rules modal', async () => {
    render(<TransactionsPage />)

    await screen.findByText('NETFLIX')
    fireEvent.click(screen.getByRole('button', { name: /category rules/i }))
    fireEvent.click(screen.getByRole('button', { name: /close category rules/i }))

    expect(screen.queryByRole('dialog', { name: /category rules/i })).not.toBeInTheDocument()
  })
})
