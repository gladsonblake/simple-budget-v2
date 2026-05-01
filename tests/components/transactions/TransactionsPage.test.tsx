import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../utils'
import TransactionsPage from '@/app/transactions/page'
import type { Category, CategoryRule, Transaction } from '@/lib/types'

vi.mock('@/app/transactions/CategoryRulesPanel', () => ({
  default: () => <div>Rules Panel</div>,
}))

vi.mock('@/lib/db', () => ({
  getTransactions: vi.fn(),
  getCategoryRules: vi.fn(),
  getCategories: vi.fn(),
  updateTransactionCategory: vi.fn(),
}))

const transactions: Transaction[] = [
  {
    id: 1,
    date: '2026-05-10',
    description: 'Coffee Shop',
    amount: 5.5,
    transaction_type: 'debit',
    memo: 'Morning coffee',
    category: 'Dining',
    notes: null,
    extra_data: null,
    imported_at: '2026-05-10T08:00:00.000Z',
    profile_id: 1,
  },
  {
    id: 2,
    date: '2026-05-03',
    description: 'Paycheck',
    amount: 1500,
    transaction_type: 'credit',
    memo: null,
    category: 'Income',
    notes: null,
    extra_data: null,
    imported_at: '2026-05-03T08:00:00.000Z',
    profile_id: 1,
  },
  {
    id: 3,
    date: '2026-04-28',
    description: 'Groceries',
    amount: 84.2,
    transaction_type: 'debit',
    memo: null,
    category: 'Groceries',
    notes: null,
    extra_data: null,
    imported_at: '2026-04-28T08:00:00.000Z',
    profile_id: 1,
  },
]

const rules: CategoryRule[] = []
const categories: Category[] = [
  { id: 1, name: 'Dining' },
  { id: 2, name: 'Income' },
  { id: 3, name: 'Groceries' },
]

describe('TransactionsPage', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-05-15T12:00:00.000Z'))
    vi.clearAllMocks()

    const db = await import('@/lib/db')
    vi.mocked(db.getTransactions).mockResolvedValue(transactions)
    vi.mocked(db.getCategoryRules).mockResolvedValue(rules)
    vi.mocked(db.getCategories).mockResolvedValue(categories)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults the month filter to the current month', async () => {
    render(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /month/i })).toHaveValue('2026-05')
    })

    expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
    expect(screen.getByText('Paycheck')).toBeInTheDocument()
    expect(screen.queryByText('2026-04-28')).not.toBeInTheDocument()
  })

  it('shows transactions for the selected month', async () => {
    render(<TransactionsPage />)

    const monthSelect = await screen.findByRole('combobox', { name: /month/i })
    fireEvent.change(monthSelect, { target: { value: '2026-04' } })

    expect(screen.getByText('2026-04-28')).toBeInTheDocument()
    expect(screen.queryByText('Coffee Shop')).not.toBeInTheDocument()
    expect(screen.queryByText('Paycheck')).not.toBeInTheDocument()
  })
})
