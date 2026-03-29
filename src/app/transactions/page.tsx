'use client'
import { useEffect, useState } from 'react'
import { getTransactions, getCategoryRules, getCategories, addCategory } from '@/lib/db'
import { effectiveCategory } from '@/lib/rules'
import type { Transaction, CategoryRule, Category } from '@/lib/types'
import CategoryRulesPanel from './CategoryRulesPanel'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showRules, setShowRules] = useState(false)

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

  async function handleAddCategory(name: string) {
    const cat = await addCategory(name)
    await load()
    return cat
  }

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
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 max-w-xl">
          <CategoryRulesPanel
            rules={rules}
            categories={categories}
            onChange={load}
            onAddCategory={handleAddCategory}
          />
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
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {effectiveCategory(t.category, t.description, rules) ?? '—'}
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
