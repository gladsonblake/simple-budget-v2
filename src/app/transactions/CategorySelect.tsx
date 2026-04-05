'use client'
import { useState, useRef, useEffect } from 'react'
import type { Category } from '@/lib/types'

interface Props {
  value: string
  placeholder?: string
  categories: Category[]
  disabled?: boolean
  onChange: (value: string) => void
}

export default function CategorySelect({ value, placeholder, categories, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query
    ? categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : categories

  const exactMatch = categories.some(c => c.name.toLowerCase() === query.toLowerCase())
  const showCreate = query.trim() && !exactMatch

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(name: string) {
    onChange(name)
    setOpen(false)
    setQuery('')
  }

  function handleClear() {
    onChange('')
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showCreate) {
        select(query.trim())
      } else if (filtered.length === 1) {
        select(filtered[0].name)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoFocus
          placeholder="Type to search or create..."
          aria-label="Category search"
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-left text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50 truncate"
        >
          {value || <span className="text-gray-400">{placeholder || '— uncategorized —'}</span>}
        </button>
      )}

      {open && (
        <ul className="absolute z-20 mt-1 max-h-48 w-56 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg text-xs">
          {value && (
            <li>
              <button
                type="button"
                onClick={handleClear}
                className="w-full px-3 py-1.5 text-left text-gray-400 hover:bg-gray-50"
              >
                — clear category —
              </button>
            </li>
          )}
          {showCreate && (
            <li>
              <button
                type="button"
                onClick={() => select(query.trim())}
                className="w-full px-3 py-1.5 text-left text-gray-900 font-medium hover:bg-gray-100"
              >
                Create &ldquo;{query.trim()}&rdquo;
              </button>
            </li>
          )}
          {filtered.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => select(c.name)}
                className={`w-full px-3 py-1.5 text-left hover:bg-gray-100 ${c.name === value ? 'bg-gray-50 font-medium' : 'text-gray-700'}`}
              >
                {c.name}
              </button>
            </li>
          ))}
          {filtered.length === 0 && !showCreate && (
            <li className="px-3 py-1.5 text-gray-400">No categories found</li>
          )}
        </ul>
      )}
    </div>
  )
}
