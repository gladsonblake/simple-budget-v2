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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowRules(true)}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Category Rules
        </button>
      </div>

      {showRules && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={() => setShowRules(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-rules-dialog-title"
            className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="category-rules-dialog-title" className="text-lg font-semibold text-gray-900">
                Category Rules
              </h2>
              <button
                onClick={() => setShowRules(false)}
                aria-label="Close category rules"
                className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>

            <CategoryRulesPanel
              rules={rules}
              categories={categories}
              onChange={load}
            />
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <p className="text-sm text-gray-400">No transactions yet. Import a CSV to get started.</p>
      ) : (
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
              {transactions.map(t => (
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
      )}
    </div>
  )
}
