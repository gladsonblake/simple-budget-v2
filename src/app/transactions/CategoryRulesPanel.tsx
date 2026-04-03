'use client'
import { useState, useEffect, useMemo } from 'react'
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
  const [search, setSearch] = useState('')
  const [newPattern, setNewPattern] = useState('')
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    setDrafts(rules.map(r => ({ pattern: r.pattern, category: r.category, priority: r.priority })))
  }, [rules])

  // Group drafts by category
  const grouped = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const d of drafts) {
      if (!d.category) continue
      const patterns = map.get(d.category) ?? []
      patterns.push(d.pattern)
      map.set(d.category, patterns)
    }
    // Include drafts with empty category (shouldn't happen normally, but preserve them)
    for (const d of drafts) {
      if (d.category) continue
      const patterns = map.get('') ?? []
      patterns.push(d.pattern)
      map.set('', patterns)
    }
    return map
  }, [drafts])

  // Filter by search term
  const filteredCategories = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return Array.from(grouped.entries())
    return Array.from(grouped.entries()).filter(([cat, patterns]) =>
      cat.toLowerCase().includes(term) ||
      patterns.some(p => p.toLowerCase().includes(term))
    )
  }, [grouped, search])

  function addRule() {
    if (!newPattern.trim() || !newCategory.trim()) return
    setDrafts(d => [...d, { pattern: newPattern.trim(), category: newCategory, priority: d.length }])
    setNewPattern('')
    setNewCategory('')
  }

  function addPatternToCategory(category: string) {
    const pattern = prompt('Enter pattern (e.g. NETFLIX)')
    if (!pattern?.trim()) return
    setDrafts(d => [...d, { pattern: pattern.trim(), category, priority: d.length }])
  }

  function removePattern(category: string, pattern: string) {
    setDrafts(d => {
      // Remove the first matching rule with this category+pattern
      let removed = false
      return d
        .filter(r => {
          if (!removed && r.category === category && r.pattern === pattern) {
            removed = true
            return false
          }
          return true
        })
        .map((r, idx) => ({ ...r, priority: idx }))
    })
  }

  function removeCategory(category: string) {
    setDrafts(d => d.filter(r => r.category !== category).map((r, idx) => ({ ...r, priority: idx })))
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

  function handleAddKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addRule()
    }
  }

  const totalRules = drafts.filter(r => r.pattern.trim() && r.category.trim()).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          Category Rules
          <span className="ml-1.5 text-xs font-normal text-gray-400">({totalRules})</span>
        </h2>
      </div>

      {/* Search filter - show when there are enough rules */}
      {totalRules > 5 && (
        <input
          type="text"
          placeholder="Search rules…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      )}

      {/* Grouped rules */}
      {filteredCategories.length === 0 && drafts.length > 0 && (
        <p className="text-xs text-gray-400">No rules match your search.</p>
      )}
      {drafts.length === 0 && (
        <p className="text-xs text-gray-400">No rules yet. Add one below to auto-categorize transactions.</p>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredCategories.map(([category, patterns]) => (
          <div key={category || '__empty'} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700">{category || '(no category)'}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => addPatternToCategory(category)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  title="Add pattern"
                >
                  +
                </button>
                <button
                  onClick={() => removeCategory(category)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove all rules for this category"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {patterns.map((pattern, i) => (
                <span
                  key={`${pattern}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-600"
                >
                  {pattern}
                  <button
                    onClick={() => removePattern(category, pattern)}
                    className="text-gray-300 hover:text-red-500 transition-colors leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add new rule */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <input
          type="text"
          placeholder="Pattern (e.g. NETFLIX)"
          value={newPattern}
          onChange={e => setNewPattern(e.target.value)}
          onKeyDown={handleAddKeyDown}
          className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <span className="text-xs text-gray-400">→</span>
        <CategorySelect
          value={newCategory}
          categories={categories}
          onChange={v => setNewCategory(v)}
        />
        <button
          onClick={addRule}
          className="text-xs font-medium text-gray-600 border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
        >
          Add Rule
        </button>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
        >
          Save Rules
        </button>
        {saveError && <p className="text-xs text-red-500">{saveError}</p>}
      </div>
    </div>
  )
}
