'use client'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { getTransactions, getCategoryRules, getRecurringExpenses } from '@/lib/db'
import { getCategoryTotals, getMonthlyTotals, getSummaryStats, generateRecurringTransactions } from '@/lib/dashboard'
import type { Transaction, CategoryRule, RecurringExpense } from '@/lib/types'
import type { DashboardStats, CategoryTotal, MonthlyTotal } from '@/lib/dashboard'

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [includeRecurring, setIncludeRecurring] = useState(true)

  useEffect(() => {
    async function load() {
      const [txns, rls, recurring] = await Promise.all([
        getTransactions(),
        getCategoryRules(),
        getRecurringExpenses(),
      ])
      setTransactions(txns)
      setRules(rls)
      setRecurringExpenses(recurring)
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()
  const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const recurringTxns = includeRecurring
    ? generateRecurringTransactions(recurringExpenses, currentDate)
    : []

  const allTransactions = [...transactions, ...recurringTxns]

  const monthlyTotals: MonthlyTotal[] = getMonthlyTotals(allTransactions).slice(-12)

  const availableMonths: string[] = Array.from(
    new Set(allTransactions.map(t => t.date.slice(0, 7)))
  ).sort()

  const filtered = selectedMonth === 'all'
    ? allTransactions
    : allTransactions.filter(t => t.date.startsWith(selectedMonth))

  const stats: DashboardStats = getSummaryStats(filtered)
  const categoryTotals: CategoryTotal[] = getCategoryTotals(filtered, rules).slice(0, 10)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        {recurringExpenses.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeRecurring}
              onChange={e => setIncludeRecurring(e.target.checked)}
              className="rounded border-gray-300"
            />
            Include recurring expenses
          </label>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-gray-400">Loading...</p>
      ) : allTransactions.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">No transactions yet. Import a CSV to get started.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Expenses" value={fmt.format(stats.totalExpenses)} highlight />
            <StatCard label="Total Income" value={fmt.format(stats.totalIncome)} />
            <StatCard
              label="Net Balance"
              value={fmt.format(stats.net)}
              highlight={stats.net < 0}
            />
            <StatCard label="Transactions" value={String(stats.transactionCount)} />
          </div>

          {/* Spending by Category */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Spending by Category</h2>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                aria-label="Select month"
              >
                <option value="all">All months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(200, categoryTotals.length * 36)}>
              <BarChart
                data={categoryTotals}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={v => `$${(v as number).toFixed(0)}`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={110}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(v: number) => fmt.format(v)} />
                <Bar dataKey="total" name="Spending" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Trend</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={monthlyTotals}
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v as number).toFixed(0)}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt.format(v)} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
