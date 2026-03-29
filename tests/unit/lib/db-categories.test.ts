import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockExecute, mockSelect } = vi.hoisted(() => ({
  mockExecute: vi.fn().mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 }),
  mockSelect: vi.fn().mockResolvedValue([]),
}))

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: vi.fn().mockResolvedValue({ execute: mockExecute, select: mockSelect }),
  },
}))

import {
  _resetDbForTesting,
  getCategories,
  addCategory,
  renameCategory,
  deleteCategory,
} from '@/lib/db'

beforeEach(() => {
  vi.clearAllMocks()
  _resetDbForTesting()
})

describe('getCategories', () => {
  it('returns rows from the categories table ordered by name', async () => {
    mockSelect.mockResolvedValueOnce([
      { id: 1, name: 'Groceries' },
      { id: 2, name: 'Entertainment' },
    ])
    const cats = await getCategories()
    expect(cats).toEqual([{ id: 1, name: 'Groceries' }, { id: 2, name: 'Entertainment' }])
    expect(mockSelect).toHaveBeenCalledWith('SELECT * FROM categories ORDER BY name ASC')
  })
})

describe('addCategory', () => {
  it('inserts a new category and returns it with the new id', async () => {
    mockExecute.mockResolvedValueOnce({ lastInsertId: 5, rowsAffected: 1 })
    const cat = await addCategory('Transport')
    expect(cat).toEqual({ id: 5, name: 'Transport' })
    expect(mockExecute).toHaveBeenCalledWith(
      'INSERT INTO categories (name) VALUES ($1)',
      ['Transport']
    )
  })
})

describe('renameCategory', () => {
  it('updates the category name and syncs category_rules', async () => {
    mockSelect.mockResolvedValueOnce([{ name: 'Food' }])
    await renameCategory(3, 'Food & Drink')
    expect(mockExecute).toHaveBeenCalledWith(
      'UPDATE categories SET name = $1 WHERE id = $2',
      ['Food & Drink', 3]
    )
    expect(mockExecute).toHaveBeenCalledWith(
      'UPDATE category_rules SET category = $1 WHERE category = $2',
      ['Food & Drink', 'Food']
    )
  })

  it('does nothing when the category does not exist', async () => {
    mockSelect.mockResolvedValueOnce([])
    await renameCategory(99, 'New Name')
    expect(mockExecute).not.toHaveBeenCalled()
  })
})

describe('deleteCategory', () => {
  it('deletes a category when no rules reference it', async () => {
    mockSelect
      .mockResolvedValueOnce([{ name: 'Transport' }]) // fetch category name
      .mockResolvedValueOnce([])                       // no referencing rules
    const result = await deleteCategory(3)
    expect(result).toEqual({})
    expect(mockExecute).toHaveBeenCalledWith('DELETE FROM categories WHERE id = $1', [3])
  })

  it('returns an error when rules reference the category', async () => {
    mockSelect
      .mockResolvedValueOnce([{ name: 'Transport' }])
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]) // 2 referencing rules
    const result = await deleteCategory(3)
    expect(result).toEqual({ error: '2 rules use this category' })
    expect(mockExecute).not.toHaveBeenCalledWith('DELETE FROM categories WHERE id = $1', [3])
  })

  it('returns a singular error message when exactly one rule references the category', async () => {
    mockSelect
      .mockResolvedValueOnce([{ name: 'Transport' }])
      .mockResolvedValueOnce([{ id: 1 }]) // 1 referencing rule
    const result = await deleteCategory(3)
    expect(result).toEqual({ error: '1 rule use this category' })
  })

  it('returns empty object when category does not exist', async () => {
    mockSelect.mockResolvedValueOnce([])
    const result = await deleteCategory(99)
    expect(result).toEqual({})
  })
})
