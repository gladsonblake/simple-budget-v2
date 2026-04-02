import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../utils'
import React from 'react'
import DashboardPage from '@/app/dashboard/page'
import type { Transaction } from '@/lib/types'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div role="img" aria-label="bar chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

vi.mock('@/lib/db', () => ({
  getTransactions: vi.fn(),
  getCategoryRules: vi.fn(),
}))

import { getTransactions, getCategoryRules } from '@/lib/db'

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    date: '2025-01-15',
    description: 'Test',
    amount: 50,
    transaction_type: null,
    memo: null,
    category: 'Food',
    notes: null,
    extra_data: null,
    imported_at: '2025-01-15T00:00:00Z',
    profile_id: 1,
    ...overrides,
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getCategoryRules).mockResolvedValue([])
  })

  it('renders the dashboard heading', () => {
    vi.mocked(getTransactions).mockResolvedValue([])
    render(<DashboardPage />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    vi.mocked(getTransactions).mockReturnValue(new Promise(() => {}))
    render(<DashboardPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows empty state when no transactions', async () => {
    vi.mocked(getTransactions).mockResolvedValue([])
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText(/no transactions/i)).toBeInTheDocument()
    })
  })

  it('displays total expenses in summary', async () => {
    vi.mocked(getTransactions).mockResolvedValue([
      makeTx({ id: 1, amount: 50 }),
      makeTx({ id: 2, amount: 30 }),
    ])
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('$80.00')).toBeInTheDocument()
    })
  })

  it('displays total income in summary', async () => {
    vi.mocked(getTransactions).mockResolvedValue([
      makeTx({ id: 1, amount: -2000, category: 'Income' }),
      makeTx({ id: 2, amount: 300, category: 'Food' }),
    ])
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('$2,000.00')).toBeInTheDocument()
    })
  })

  it('displays net balance in summary', async () => {
    vi.mocked(getTransactions).mockResolvedValue([
      makeTx({ id: 1, amount: -1000, category: 'Salary' }),
      makeTx({ id: 2, amount: 400 }),
    ])
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('$600.00')).toBeInTheDocument()
    })
  })

  it('renders spending by category section heading', async () => {
    vi.mocked(getTransactions).mockResolvedValue([makeTx()])
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Spending by Category')).toBeInTheDocument()
    })
  })

  it('renders monthly trend section heading', async () => {
    vi.mocked(getTransactions).mockResolvedValue([makeTx()])
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Monthly Trend')).toBeInTheDocument()
    })
  })

  it('renders bar charts for categories and monthly data', async () => {
    vi.mocked(getTransactions).mockResolvedValue([makeTx()])
    render(<DashboardPage />)
    await waitFor(() => {
      const charts = screen.getAllByRole('img', { name: 'bar chart' })
      expect(charts.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('shows transaction count in summary', async () => {
    vi.mocked(getTransactions).mockResolvedValue([
      makeTx({ id: 1 }),
      makeTx({ id: 2 }),
      makeTx({ id: 3 }),
    ])
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })
})
