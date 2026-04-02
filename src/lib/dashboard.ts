import type { Transaction, CategoryRule } from './types'
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
    if (t.amount >= 0) continue
    const cat = effectiveCategory(t.category, t.description, rules) ?? 'Uncategorized'
    map[cat] = (map[cat] ?? 0) + Math.abs(t.amount)
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
    if (t.amount < 0) {
      map[key].expenses += Math.abs(t.amount)
    } else {
      map[key].income += t.amount
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
    if (t.amount < 0) totalExpenses += Math.abs(t.amount)
    else totalIncome += t.amount
  }
  return {
    totalExpenses,
    totalIncome,
    net: totalIncome - totalExpenses,
    transactionCount: transactions.length,
  }
}
