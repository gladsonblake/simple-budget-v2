'use client'
import { useState, useEffect } from 'react'
import { getCategories, addCategory, renameCategory, deleteCategory } from '@/lib/db'
import type { Category } from '@/lib/types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<number | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function load() {
    setCategories(await getCategories())
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setAddError(null)
    try {
      await addCategory(trimmed)
      setNewName('')
      await load()
    } catch {
      setAddError('Category already exists')
    }
  }

  async function handleRenameConfirm(id: number) {
    const trimmed = renameName.trim()
    if (!trimmed) return
    setRenameError(null)
    try {
      await renameCategory(id, trimmed)
      setRenameId(null)
      await load()
    } catch {
      setRenameError('Failed to rename category')
    }
  }

  async function handleDelete(id: number) {
    setDeleteError(null)
    try {
      const result = await deleteCategory(id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        await load()
      }
    } catch {
      setDeleteError('Failed to delete category')
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Categories</h1>

      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder="New category name"
          aria-label="New category name"
          className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
        >
          Add
        </button>
      </div>
      {addError && <p className="text-xs text-red-500 mb-4">{addError}</p>}

      {deleteError && <p className="text-xs text-red-600 mb-2 mt-4">{deleteError}</p>}

      {categories.length === 0 && !addError && (
        <p className="text-sm text-gray-400 mt-4">No categories yet. Add one above.</p>
      )}

      <ul className="space-y-1 mt-4">
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
                  aria-label="Rename category"
                  className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button
                  onClick={() => handleRenameConfirm(cat.id)}
                  className="text-xs font-medium text-white bg-gray-900 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { setRenameId(null); setRenameError(null) }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
                {renameError && <p className="text-xs text-red-500">{renameError}</p>}
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
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
  )
}
