import { describe, it, expect } from 'vitest'
import { getCategoryTotals, getMonthlyTotals, getSummaryStats } from '@/lib/dashboard'
import type { Transaction, CategoryRule } from '@/lib/types'

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
