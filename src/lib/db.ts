import Database from '@tauri-apps/plugin-sql'
import type { Profile, Transaction, CategoryRule, Category } from './types'

let _db: Database | null = null

export function _resetDbForTesting() {
  _db = null
}

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load('sqlite:budget.db')
  }
  return _db
}

export async function initDb(): Promise<void> {
  const db = await getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      column_map TEXT NOT NULL,
      extra_column_map TEXT NOT NULL DEFAULT '{}',
      date_format TEXT NOT NULL,
      sign_convention TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_type TEXT,
      memo TEXT,
      category TEXT,
      notes TEXT,
      extra_data TEXT,
      imported_at TEXT NOT NULL,
      profile_id INTEGER NOT NULL REFERENCES profiles(id)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS category_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      category TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `)
}

export async function getProfiles(): Promise<Profile[]> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: number; name: string; column_map: string; extra_column_map: string
    date_format: string; sign_convention: string; created_at: string
  }>>('SELECT * FROM profiles ORDER BY created_at DESC')
  return rows.map(r => ({
    ...r,
    column_map: JSON.parse(r.column_map) as Profile['column_map'],
    extra_column_map: JSON.parse(r.extra_column_map) as Record<string, string>,
    date_format: r.date_format as Profile['date_format'],
    sign_convention: r.sign_convention as Profile['sign_convention'],
  }))
}

export async function saveProfile(
  profile: Omit<Profile, 'id' | 'created_at'>
): Promise<number> {
  const db = await getDb()
  const result = await db.execute(
    `INSERT INTO profiles (name, column_map, extra_column_map, date_format, sign_convention, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      profile.name,
      JSON.stringify(profile.column_map),
      JSON.stringify(profile.extra_column_map),
      profile.date_format,
      profile.sign_convention,
      new Date().toISOString(),
    ]
  )
  return result.lastInsertId ?? 0
}

export async function deleteProfile(id: number): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM transactions WHERE profile_id = $1', [id])
  await db.execute('DELETE FROM profiles WHERE id = $1', [id])
}

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const db = await getDb()
  return db.select<CategoryRule[]>(
    'SELECT * FROM category_rules ORDER BY priority ASC'
  )
}

export async function saveCategoryRules(
  rules: Omit<CategoryRule, 'id'>[]
): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM category_rules')
  for (const rule of rules) {
    await db.execute(
      'INSERT INTO category_rules (pattern, category, priority) VALUES ($1, $2, $3)',
      [rule.pattern, rule.category, rule.priority]
    )
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  const db = await getDb()
  const rows = await db.select<Array<Transaction & { extra_data: string | null }>>(
    'SELECT * FROM transactions ORDER BY date DESC'
  )
  return rows.map(r => ({
    ...r,
    extra_data: r.extra_data ? JSON.parse(r.extra_data) as Record<string, string> : null,
  }))
}

export async function insertTransactions(
  rows: Array<Omit<Transaction, 'id' | 'imported_at'>>,
): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  for (const row of rows) {
    await db.execute(
      `INSERT INTO transactions
        (date, description, amount, transaction_type, memo, category, notes, extra_data, imported_at, profile_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        row.date, row.description, row.amount,
        row.transaction_type ?? null, row.memo ?? null,
        row.category ?? null, row.notes ?? null,
        row.extra_data ? JSON.stringify(row.extra_data) : null,
        now, row.profile_id,
      ]
    )
  }
}

export async function updateTransactionCategory(
  id: number,
  category: string | null
): Promise<void> {
  const db = await getDb()
  await db.execute('UPDATE transactions SET category = $1 WHERE id = $2', [category, id])
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDb()
  return db.select<Category[]>('SELECT * FROM categories ORDER BY name ASC')
}

export async function addCategory(name: string): Promise<Category> {
  const db = await getDb()
  const result = await db.execute('INSERT INTO categories (name) VALUES ($1)', [name])
  return { id: result.lastInsertId ?? 0, name }
}

export async function renameCategory(id: number, name: string): Promise<void> {
  const db = await getDb()
  const old = await db.select<Array<{ name: string }>>(
    'SELECT name FROM categories WHERE id = $1',
    [id]
  )
  if (old.length === 0) return
  await db.execute('UPDATE categories SET name = $1 WHERE id = $2', [name, id])
  await db.execute(
    'UPDATE category_rules SET category = $1 WHERE category = $2',
    [name, old[0].name]
  )
}

export async function deleteCategory(id: number): Promise<{ error?: string }> {
  const db = await getDb()
  const rows = await db.select<Array<{ name: string }>>(
    'SELECT name FROM categories WHERE id = $1',
    [id]
  )
  if (rows.length === 0) return {}
  const refs = await db.select<Array<{ id: number }>>(
    'SELECT id FROM category_rules WHERE category = $1',
    [rows[0].name]
  )
  if (refs.length > 0) {
    return { error: `${refs.length} rule${refs.length !== 1 ? 's' : ''} use${refs.length === 1 ? 's' : ''} this category` }
  }
  await db.execute('DELETE FROM categories WHERE id = $1', [id])
  return {}
}
