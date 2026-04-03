import type { Transaction, CategoryRule, RecurringExpense } from './types'
import { effectiveCategory } from './rules'

export interface CategoryTotal {
  category: string
  total: number
}

export interface MonthlyTotal {
  month: string
  expenses: number
  income: number
}

export interface DashboardStats {
  totalExpenses: number
  totalIncome: number
  net: number
  transactionCount: number
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function getCategoryTotals(
  transactions: Transaction[],
  rules: CategoryRule[],
): CategoryTotal[] {
  const map: Record<string, number> = {}
  for (const t of transactions) {
    if (t.amount <= 0) continue
    const cat = effectiveCategory(t.category, t.description, rules) ?? 'Uncategorized'
    map[cat] = (map[cat] ?? 0) + t.amount
  }
  return Object.entries(map)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

export function getMonthlyTotals(transactions: Transaction[]): MonthlyTotal[] {
  const map: Record<string, { expenses: number; income: number }> = {}
  for (const t of transactions) {
    const [year, month] = t.date.split('-')
    const key = `${year}-${month}`
    if (!map[key]) map[key] = { expenses: 0, income: 0 }
    if (t.amount > 0) {
      map[key].expenses += t.amount
    } else {
      map[key].income += Math.abs(t.amount)
    }
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { expenses, income }]) => {
      const [year, month] = key.split('-')
      const label = `${MONTH_LABELS[Number(month) - 1]} ${year}`
      return { month: label, expenses, income }
    })
}

export function getSummaryStats(transactions: Transaction[]): DashboardStats {
  let totalExpenses = 0
  let totalIncome = 0
  for (const t of transactions) {
    if (t.amount > 0) totalExpenses += t.amount
    else totalIncome += Math.abs(t.amount)
  }
  return {
    totalExpenses,
    totalIncome,
    net: totalIncome - totalExpenses,
    transactionCount: transactions.length,
  }
}

function addInterval(date: Date, frequency: RecurringExpense['frequency']): Date {
  const next = new Date(date)
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function generateRecurringTransactions(
  expenses: RecurringExpense[],
  currentDate: string,
): Transaction[] {
  const transactions: Transaction[] = []
  let id = -1

  for (const expense of expenses) {
    const endStr = expense.end_date ?? currentDate
    const end = new Date(endStr + 'T00:00:00')
    let cursor = new Date(expense.start_date + 'T00:00:00')

    while (cursor <= end) {
      const date = formatDate(cursor)
      transactions.push({
        id: id--,
        date,
        description: `[Recurring] ${expense.name}`,
        amount: expense.amount,
        transaction_type: null,
        memo: null,
        category: expense.category,
        notes: null,
        extra_data: null,
        imported_at: '',
        profile_id: 0,
      })
      cursor = addInterval(cursor, expense.frequency)
    }
  }

  return transactions
}
