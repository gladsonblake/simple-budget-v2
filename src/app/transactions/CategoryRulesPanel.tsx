'use client'
import { useState, useEffect } from 'react'
import { saveCategoryRules } from '@/lib/db'
import type { CategoryRule, Category } from '@/lib/types'
import CategorySelect from './CategorySelect'

type DraftRule = Omit<CategoryRule, 'id'>

interface Props {
  rules: CategoryRule[]
  categories: Category[]
  onChange: () => void
}

export default function CategoryRulesPanel({ rules, categories, onChange }: Props) {
  const [drafts, setDrafts] = useState<DraftRule[]>(
    rules.map(r => ({ pattern: r.pattern, category: r.category, priority: r.priority }))
  )
  const [saveError, setSaveError] = useState<string | null>(null)

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
    setSaveError(null)
    try {
      const valid = drafts.filter(r => r.pattern.trim() && r.category.trim())
      await saveCategoryRules(valid)
      onChange()
    } catch {
      setSaveError('Failed to save rules')
    }
  }

  return (
    <div className="space-y-4">
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
        {saveError && <p className="text-xs text-red-500 mt-1">{saveError}</p>}
      </div>
    </div>
  )
}
