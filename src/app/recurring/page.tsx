'use client'
import { useState, useEffect } from 'react'
import {
  getRecurringExpenses,
  addRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  getCategories,
} from '@/lib/db'
import type { RecurringExpense, Category } from '@/lib/types'

const FREQUENCIES: RecurringExpense['frequency'][] = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]

const FREQUENCY_LABELS: Record<RecurringExpense['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

interface FormState {
  name: string
  amount: string
  category: string
  frequency: RecurringExpense['frequency']
}

const emptyForm: FormState = { name: '', amount: '', category: '', frequency: 'monthly' }

export default function RecurringPage() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const [exp, cats] = await Promise.all([getRecurringExpenses(), getCategories()])
    setExpenses(exp)
    setCategories(cats)
  }

  useEffect(() => { load() }, [])

  function validate(): string | null {
    if (!form.name.trim()) return 'Name is required'
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) return 'Amount must be a positive number'
    if (!form.category) return 'Category is required'
    return null
  }

  async function handleSubmit() {
    setError(null)
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    const payload = {
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      frequency: form.frequency,
    }
    try {
      if (editId !== null) {
        await updateRecurringExpense(editId, payload)
      } else {
        await addRecurringExpense(payload)
      }
      setForm(emptyForm)
      setEditId(null)
      await load()
    } catch {
      setError('Failed to save recurring expense')
    }
  }

  function startEdit(expense: RecurringExpense) {
    setEditId(expense.id)
    setForm({
      name: expense.name,
      amount: String(expense.amount),
      category: expense.category,
      frequency: expense.frequency,
    })
    setError(null)
  }

  function cancelEdit() {
    setEditId(null)
    setForm(emptyForm)
    setError(null)
  }

  async function handleDelete(id: number) {
    setError(null)
    try {
      await deleteRecurringExpense(id)
      if (editId === id) cancelEdit()
      await load()
    } catch {
      setError('Failed to delete recurring expense')
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Recurring Expenses</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          {editId !== null ? 'Edit Expense' : 'Add Expense'}
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Name (e.g. Netflix)"
            aria-label="Expense name"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            type="text"
            inputMode="decimal"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Amount"
            aria-label="Expense amount"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            aria-label="Category"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Select category</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select
            value={form.frequency}
            onChange={e => setForm(f => ({ ...f, frequency: e.target.value as RecurringExpense['frequency'] }))}
            aria-label="Frequency"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            {FREQUENCIES.map(f => (
              <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
          >
            {editId !== null ? 'Save' : 'Add'}
          </button>
          {editId !== null && (
            <button
              onClick={cancelEdit}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm text-gray-400">No recurring expenses yet. Add one above.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Frequency</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-700">{exp.name}</td>
                <td className="py-2 text-gray-700">${exp.amount.toFixed(2)}</td>
                <td className="py-2 text-gray-700">{exp.category}</td>
                <td className="py-2 text-gray-700">{FREQUENCY_LABELS[exp.frequency]}</td>
                <td className="py-2 text-right space-x-2">
                  <button
                    onClick={() => startEdit(exp)}
                    aria-label={`Edit ${exp.name}`}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    aria-label={`Delete ${exp.name}`}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
