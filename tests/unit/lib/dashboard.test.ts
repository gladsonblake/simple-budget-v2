import { describe, it, expect } from 'vitest'
import { getCategoryTotals, getMonthlyTotals, getSummaryStats, generateRecurringTransactions } from '@/lib/dashboard'
import type { Transaction, CategoryRule, RecurringExpense } from '@/lib/types'

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    date: '2025-01-15',
    description: 'Test',
    amount: 10,
    transaction_type: null,
    memo: null,
    category: null,
    notes: null,
    extra_data: null,
    imported_at: '2025-01-15T00:00:00Z',
    profile_id: 1,
    ...overrides,
  }
}

describe('getCategoryTotals', () => {
  it('returns empty array when no transactions', () => {
    expect(getCategoryTotals([], [])).toEqual([])
  })

  it('ignores income (negative amounts)', () => {
    const result = getCategoryTotals([tx({ amount: -100, category: 'Salary' })], [])
    expect(result).toEqual([])
  })

  it('groups expenses by category and sums values', () => {
    const transactions = [
      tx({ id: 1, amount: 50, category: 'Food' }),
      tx({ id: 2, amount: 30, category: 'Food' }),
      tx({ id: 3, amount: 20, category: 'Transport' }),
    ]
    const result = getCategoryTotals(transactions, [])
    expect(result).toEqual([
      { category: 'Food', total: 80 },
      { category: 'Transport', total: 20 },
    ])
  })

  it('sorts by total descending', () => {
    const transactions = [
      tx({ id: 1, amount: 10, category: 'Small' }),
      tx({ id: 2, amount: 200, category: 'Big' }),
      tx({ id: 3, amount: 50, category: 'Medium' }),
    ]
    const result = getCategoryTotals(transactions, [])
    expect(result.map(r => r.category)).toEqual(['Big', 'Medium', 'Small'])
  })

  it('uses "Uncategorized" for transactions with no category and no matching rule', () => {
    const transactions = [tx({ id: 1, amount: 25, category: null })]
    const result = getCategoryTotals(transactions, [])
    expect(result).toEqual([{ category: 'Uncategorized', total: 25 }])
  })

  it('applies category rules to uncategorized transactions', () => {
    const rules: CategoryRule[] = [
      { id: 1, pattern: 'grocery', category: 'Food', priority: 0 },
    ]
    const transactions = [
      tx({ id: 1, amount: 40, category: null, description: 'GROCERY STORE' }),
    ]
    const result = getCategoryTotals(transactions, rules)
    expect(result).toEqual([{ category: 'Food', total: 40 }])
  })
})

describe('getMonthlyTotals', () => {
  it('returns empty array when no transactions', () => {
    expect(getMonthlyTotals([])).toEqual([])
  })

  it('groups transactions by month', () => {
    const transactions = [
      tx({ id: 1, date: '2025-01-10', amount: 100 }),
      tx({ id: 2, date: '2025-01-20', amount: -500 }),
      tx({ id: 3, date: '2025-02-05', amount: 200 }),
    ]
    const result = getMonthlyTotals(transactions)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ expenses: 100, income: 500 })
    expect(result[1]).toMatchObject({ expenses: 200, income: 0 })
  })

  it('returns months in chronological order', () => {
    const transactions = [
      tx({ id: 1, date: '2025-03-01', amount: 10 }),
      tx({ id: 2, date: '2025-01-01', amount: 10 }),
      tx({ id: 3, date: '2025-02-01', amount: 10 }),
    ]
    const result = getMonthlyTotals(transactions)
    expect(result[0].month).toBe('Jan 2025')
    expect(result[1].month).toBe('Feb 2025')
    expect(result[2].month).toBe('Mar 2025')
  })

  it('labels each month correctly', () => {
    const transactions = [tx({ id: 1, date: '2025-06-15', amount: 50 })]
    const result = getMonthlyTotals(transactions)
    expect(result[0].month).toBe('Jun 2025')
  })

  it('filters monthly totals by effective category when requested', () => {
    const transactions = [
      tx({ id: 1, date: '2025-01-10', amount: 100, category: 'Food' }),
      tx({ id: 2, date: '2025-01-20', amount: -500, category: 'Salary' }),
      tx({ id: 3, date: '2025-02-05', amount: 200, category: null, description: 'Grocery store' }),
      tx({ id: 4, date: '2025-02-10', amount: 75, category: 'Transport' }),
    ]
    const rules: CategoryRule[] = [
      { id: 1, pattern: 'grocery', category: 'Food', priority: 0 },
    ]

    const result = getMonthlyTotals(transactions, rules, { category: 'Food' })

    expect(result).toEqual([
      { month: 'Jan 2025', expenses: 100, income: 0 },
      { month: 'Feb 2025', expenses: 200, income: 0 },
    ])
  })
})

describe('getSummaryStats', () => {
  it('returns zeros for empty transactions', () => {
    expect(getSummaryStats([])).toEqual({
      totalExpenses: 0,
      totalIncome: 0,
      net: 0,
      transactionCount: 0,
    })
  })

  it('computes expenses, income, net, and count', () => {
    const transactions = [
      tx({ id: 1, amount: 50 }),
      tx({ id: 2, amount: 30 }),
      tx({ id: 3, amount: -200 }),
    ]
    const result = getSummaryStats(transactions)
    expect(result.totalExpenses).toBe(80)
    expect(result.totalIncome).toBe(200)
    expect(result.net).toBe(120)
    expect(result.transactionCount).toBe(3)
  })

  it('handles all-expense transactions', () => {
    const transactions = [tx({ id: 1, amount: 100 }), tx({ id: 2, amount: 50 })]
    const result = getSummaryStats(transactions)
    expect(result.totalExpenses).toBe(150)
    expect(result.totalIncome).toBe(0)
    expect(result.net).toBe(-150)
  })
})

function recurring(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 1,
    name: 'Netflix',
    amount: 15,
    category: 'Entertainment',
    frequency: 'monthly',
    start_date: '2025-01-01',
    end_date: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('generateRecurringTransactions', () => {
  it('returns empty array when no recurring expenses', () => {
    expect(generateRecurringTransactions([], '2025-06-01')).toEqual([])
  })

  it('generates monthly occurrences from start to current date', () => {
    const expenses = [recurring({ start_date: '2025-01-01', end_date: null })]
    const result = generateRecurringTransactions(expenses, '2025-03-15')
    expect(result).toHaveLength(3)
    expect(result[0].date).toBe('2025-01-01')
    expect(result[1].date).toBe('2025-02-01')
    expect(result[2].date).toBe('2025-03-01')
  })

  it('stops at end_date when provided', () => {
    const expenses = [recurring({ start_date: '2025-01-01', end_date: '2025-02-15' })]
    const result = generateRecurringTransactions(expenses, '2025-12-31')
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2025-01-01')
    expect(result[1].date).toBe('2025-02-01')
  })

  it('generates weekly occurrences', () => {
    const expenses = [recurring({ frequency: 'weekly', start_date: '2025-01-01', end_date: '2025-01-22' })]
    const result = generateRecurringTransactions(expenses, '2025-12-31')
    expect(result).toHaveLength(4)
    expect(result.map(t => t.date)).toEqual([
      '2025-01-01', '2025-01-08', '2025-01-15', '2025-01-22',
    ])
  })

  it('generates biweekly occurrences', () => {
    const expenses = [recurring({ frequency: 'biweekly', start_date: '2025-01-01', end_date: '2025-02-01' })]
    const result = generateRecurringTransactions(expenses, '2025-12-31')
    expect(result).toHaveLength(3)
    expect(result.map(t => t.date)).toEqual([
      '2025-01-01', '2025-01-15', '2025-01-29',
    ])
  })

  it('generates quarterly occurrences', () => {
    const expenses = [recurring({ frequency: 'quarterly', start_date: '2025-01-01', end_date: '2025-12-31' })]
    const result = generateRecurringTransactions(expenses, '2025-12-31')
    expect(result).toHaveLength(4)
    expect(result.map(t => t.date)).toEqual([
      '2025-01-01', '2025-04-01', '2025-07-01', '2025-10-01',
    ])
  })

  it('generates yearly occurrences', () => {
    const expenses = [recurring({ frequency: 'yearly', start_date: '2024-01-01', end_date: null })]
    const result = generateRecurringTransactions(expenses, '2026-06-01')
    expect(result).toHaveLength(3)
    expect(result.map(t => t.date)).toEqual([
      '2024-01-01', '2025-01-01', '2026-01-01',
    ])
  })

  it('sets correct transaction properties', () => {
    const expenses = [recurring({ name: 'Spotify', amount: 10, category: 'Music', start_date: '2025-03-01', end_date: '2025-03-01' })]
    const result = generateRecurringTransactions(expenses, '2025-03-01')
    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('[Recurring] Spotify')
    expect(result[0].amount).toBe(10)
    expect(result[0].category).toBe('Music')
    expect(result[0].id).toBeLessThan(0)
  })

  it('handles multiple recurring expenses', () => {
    const expenses = [
      recurring({ id: 1, name: 'A', start_date: '2025-01-01', end_date: '2025-01-01' }),
      recurring({ id: 2, name: 'B', start_date: '2025-01-01', end_date: '2025-01-01' }),
    ]
    const result = generateRecurringTransactions(expenses, '2025-01-01')
    expect(result).toHaveLength(2)
  })
})
