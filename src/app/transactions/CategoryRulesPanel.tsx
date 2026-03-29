'use client'
import { useState, useEffect } from 'react'
import { saveCategoryRules, renameCategory, deleteCategory } from '@/lib/db'
import type { CategoryRule, Category } from '@/lib/types'
import CategorySelect from './CategorySelect'

type DraftRule = Omit<CategoryRule, 'id'>

interface Props {
  rules: CategoryRule[]
  categories: Category[]
  onChange: () => void
  onAddCategory: (name: string) => Promise<Category>
}

export default function CategoryRulesPanel({ rules, categories, onChange, onAddCategory }: Props) {
  const [drafts, setDrafts] = useState<DraftRule[]>(
    rules.map(r => ({ pattern: r.pattern, category: r.category, priority: r.priority }))
  )
  const [renameId, setRenameId] = useState<number | null>(null)
  const [renameName, setRenameName] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    setDrafts(rules.map(r => ({ pattern: r.pattern, category: r.category, priority: r.priority })))
  }, [rules])

  function addRule() {
    setDrafts(d => [...d, { pattern: '', category: '', priority: d.length }])
  }

  function removeRule(i: number) {
    setDrafts(d => d.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, priority: idx })))
  }

  function updatePattern(i: number, value: string) {
    setDrafts(d => d.map((r, idx) => idx === i ? { ...r, pattern: value } : r))
  }

  function updateCategory(i: number, value: string) {
    setDrafts(d => d.map((r, idx) => idx === i ? { ...r, category: value } : r))
  }

  async function handleSave() {
    const valid = drafts.filter(r => r.pattern.trim() && r.category.trim())
    await saveCategoryRules(valid)
    onChange()
  }

  async function handleRenameConfirm(id: number) {
    const trimmed = renameName.trim()
    if (!trimmed) return
    await renameCategory(id, trimmed)
    setRenameId(null)
    onChange()
  }

  async function handleDelete(id: number) {
    setDeleteError(null)
    const result = await deleteCategory(id)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      onChange()
    }
  }

  return (
    <div className="space-y-4">
      {/* Rules section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Category Rules</h2>
          <button
            onClick={addRule}
            className="text-xs font-medium text-gray-600 border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
          >
            Add Rule
          </button>
        </div>
        {drafts.length === 0 && (
          <p className="text-xs text-gray-400">No rules yet. Add one to auto-categorize transactions.</p>
        )}
        {drafts.map((rule, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Pattern (e.g. NETFLIX)"
              value={rule.pattern}
              onChange={e => updatePattern(i, e.target.value)}
              className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <span className="text-xs text-gray-400">→</span>
            <CategorySelect
              value={rule.category}
              categories={categories}
              onChange={v => updateCategory(i, v)}
              onAddCategory={onAddCategory}
            />
            <button
              onClick={() => removeRule(i)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={handleSave}
          className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
        >
          Save Rules
        </button>
      </div>

      {/* Categories management section */}
      <div className="pt-3 border-t border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Categories</h2>
        {categories.length === 0 && (
          <p className="text-xs text-gray-400">No categories yet.</p>
        )}
        {deleteError && (
          <p className="text-xs text-red-600 mb-2">{deleteError}</p>
        )}
        <ul className="space-y-1">
          {categories.map(cat => (
            <li key={cat.id} className="flex items-center gap-2">
              {renameId === cat.id ? (
                <>
                  <input
                    type="text"
                    value={renameName}
                    onChange={e => setRenameName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(cat.id) }}
                    autoFocus
                    className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                    aria-label="Rename category"
                  />
                  <button
                    onClick={() => handleRenameConfirm(cat.id)}
                    className="text-xs font-medium text-white bg-gray-900 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setRenameId(null)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs text-gray-700">{cat.name}</span>
                  <button
                    onClick={() => { setRenameId(cat.id); setRenameName(cat.name); setDeleteError(null) }}
                    aria-label={`Rename ${cat.name}`}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    aria-label={`Delete ${cat.name}`}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
