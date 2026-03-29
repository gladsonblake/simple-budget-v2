'use client'
import { useState } from 'react'
import type { Category } from '@/lib/types'

interface Props {
  value: string
  categories: Category[]
  onChange: (value: string) => void
  onAddCategory: (name: string) => Promise<Category>
}

const ADD_NEW = '__add_new__'

export default function CategorySelect({ value, categories, onChange, onAddCategory }: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === ADD_NEW) {
      setAdding(true)
      setNewName('')
    } else {
      onChange(e.target.value)
    }
  }

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setAddError(null)
    try {
      const cat = await onAddCategory(trimmed)
      onChange(cat.name)
      setAdding(false)
      setNewName('')
    } catch {
      setAddError('Failed to add category')
    }
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="New category name"
            autoFocus
            className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
            aria-label="New category name"
          />
          <button
            onClick={handleAdd}
            aria-label="Add"
            className="text-xs font-medium text-white bg-gray-900 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setAdding(false); setAddError(null) }}
            aria-label="✕"
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        </div>
        {addError && (
          <p className="text-xs text-red-500">{addError}</p>
        )}
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={handleSelectChange}
      className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
    >
      <option value="">— select —</option>
      {categories.map(c => (
        <option key={c.id} value={c.name}>{c.name}</option>
      ))}
      <option value={ADD_NEW}>+ Add new category…</option>
    </select>
  )
}
