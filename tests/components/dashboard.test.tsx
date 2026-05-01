import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '../utils'
import userEvent from '@testing-library/user-event'
import React from 'react'
import DashboardPage from '@/app/dashboard/page'
import type { Transaction } from '@/lib/types'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  BarChart: ({ children, data }: { children: React.ReactNode; data?: unknown }) => (
    <div role="img" aria-label="bar chart">
      <output data-testid="chart-data">{JSON.stringify(data ?? null)}</output>
      {children}
    </div>
  ),
  Bar: ({ name, dataKey }: { name?: string; dataKey?: string }) => (
    <span data-testid="chart-series">{`${name ?? 'Series'}:${String(dataKey ?? '')}`}</span>
  ),
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

vi.mock('@/lib/db', () => ({
  getTransactions: vi.fn(),
  getCategoryRules: vi.fn(),
  getRecurringExpenses: vi.fn(),
}))

import { getTransactions, getCategoryRules, getRecurringExpenses } from '@/lib/db'

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
    vi.mocked(getRecurringExpenses).mockResolvedValue([])
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

  it('allows choosing which monthly trend series to show', async () => {
    vi.mocked(getTransactions).mockResolvedValue([
      makeTx({ id: 1, date: '2025-01-10', amount: 100, category: 'Food' }),
      makeTx({ id: 2, date: '2025-01-20', amount: -2000, category: 'Salary' }),
    ])

    const user = userEvent.setup()
    render(<DashboardPage />)

    const monthlyTrend = (await screen.findByText('Monthly Trend')).closest('div.bg-white.rounded-lg.border.border-gray-200.p-5')
    expect(monthlyTrend).not.toBeNull()

    const seriesSelect = await screen.findByRole('combobox', { name: 'Select monthly trend series' })
    expect(within(monthlyTrend as HTMLElement).getAllByTestId('chart-series').map(node => node.textContent)).toEqual([
      'Income:income',
      'Expenses:expenses',
    ])

    await user.selectOptions(seriesSelect, 'expenses')
    expect(within(monthlyTrend as HTMLElement).getAllByTestId('chart-series').map(node => node.textContent)).toEqual([
      'Expenses:expenses',
    ])

    await user.selectOptions(seriesSelect, 'income')
    expect(within(monthlyTrend as HTMLElement).getAllByTestId('chart-series').map(node => node.textContent)).toEqual([
      'Income:income',
    ])
  })

  it('filters monthly trend data by category', async () => {
    vi.mocked(getTransactions).mockResolvedValue([
      makeTx({ id: 1, date: '2025-01-10', amount: 100, category: 'Food' }),
      makeTx({ id: 2, date: '2025-01-12', amount: 80, category: 'Transport' }),
      makeTx({ id: 3, date: '2025-01-20', amount: -2000, category: 'Salary' }),
      makeTx({ id: 4, date: '2025-02-01', amount: 40, category: 'Food' }),
    ])

    const user = userEvent.setup()
    render(<DashboardPage />)

    const categorySelect = await screen.findByRole('combobox', { name: 'Filter monthly trend by category' })
    expect(screen.getByRole('option', { name: 'All categories' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Food' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Salary' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Transport' })).toBeInTheDocument()

    await user.selectOptions(categorySelect, 'Food')

    const monthlyTrend = screen.getByText('Monthly Trend').closest('div.bg-white.rounded-lg.border.border-gray-200.p-5')
    expect(monthlyTrend).not.toBeNull()

    const chartData = within(monthlyTrend as HTMLElement).getByTestId('chart-data')
    expect(chartData.textContent).toContain('"expenses":100')
    expect(chartData.textContent).toContain('"expenses":40')
    expect(chartData.textContent).not.toContain('"income":2000')
    expect(chartData.textContent).not.toContain('"expenses":80')
  })
})
