'use client'
import { useEffect, useState } from 'react'
import { getTransactions, getCategoryRules, getCategories, updateTransactionCategory } from '@/lib/db'
import { applyRules } from '@/lib/rules'
import type { Transaction, CategoryRule, Category } from '@/lib/types'
import CategoryRulesPanel from './CategoryRulesPanel'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showRules, setShowRules] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')

  async function handleCategoryChange(txn: Transaction, category: string) {
    const newCategory = category === '' ? null : category
    setSavingId(txn.id)
    await updateTransactionCategory(txn.id, newCategory)
    setTransactions(prev =>
      prev.map(t => t.id === txn.id ? { ...t, category: newCategory } : t)
    )
    setSavingId(null)
  }

  async function load() {
    const [txns, rls, cats] = await Promise.all([
      getTransactions(),
      getCategoryRules(),
      getCategories(),
    ])
    setTransactions(txns)
    setRules(rls)
    setCategories(cats)
  }

  useEffect(() => { load() }, [])

  const availableMonths = Array.from(
    new Set(transactions.map(t => t.date.slice(0, 7)))
  ).sort().reverse()

  const availableCategories = Array.from(
    new Set(transactions.map(t => t.category).filter((c): c is string => c !== null))
  ).sort()

  const filtered = transactions.filter(t => {
    if (selectedMonth !== 'all' && !t.date.startsWith(selectedMonth)) return false
    if (selectedCategory === 'uncategorized') return t.category === null
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false
    return true
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowRules(r => !r)}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {showRules ? 'Hide Rules' : 'Category Rules'}
        </button>
      </div>

      {showRules && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 max-w-2xl">
          <CategoryRulesPanel
            rules={rules}
            categories={categories}
            onChange={load}
          />
        </div>
      )}

      {transactions.length === 0 ? (
        <p className="text-sm text-gray-400">No transactions yet. Import a CSV to get started.</p>
      ) : (
        <>
        <div className="flex items-center gap-3 mb-4">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All months</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All categories</option>
            <option value="uncategorized">Uncategorized</option>
            {availableCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {(selectedMonth !== 'all' || selectedCategory !== 'all') && (
            <span className="text-xs text-gray-400">
              {filtered.length} of {transactions.length} transactions
            </span>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Memo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{t.description}</td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                    {t.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.transaction_type ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={t.category ?? ''}
                      disabled={savingId === t.id}
                      onChange={e => handleCategoryChange(t, e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                    >
                      <option value="">
                        {applyRules(t.description, rules)
                          ? `Auto: ${applyRules(t.description, rules)}`
                          : '— uncategorized —'}
                      </option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{t.memo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
