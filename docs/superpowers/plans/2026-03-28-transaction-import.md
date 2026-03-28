# Transaction Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full transaction import feature — provider profile wizard, CSV import flow, and transactions page with category rules.

**Architecture:** Frontend-heavy. CSV parsing, mapping, rule application, and duplicate detection are pure TypeScript functions. `@tauri-apps/plugin-sql` provides direct SQLite access from the frontend; Rust only registers the plugin. All pages are client components (`"use client"`) because the app is a static export loaded in a Tauri WebView.

**Tech Stack:** Next.js 16 (static export), Tauri 2, `@tauri-apps/plugin-sql` (SQLite), React 19, Tailwind CSS 4, Vitest + React Testing Library

---

## File Map

**Create:**
- `src/lib/types.ts` — shared TypeScript types
- `src/lib/csv.ts` — CSV parser (pure)
- `src/lib/mapping.ts` — column mapping + date/amount normalization (pure)
- `src/lib/rules.ts` — category rule matching (pure)
- `src/lib/duplicates.ts` — duplicate detection (pure)
- `src/lib/db.ts` — `@tauri-apps/plugin-sql` wrappers + DB init
- `src/app/AppInit.tsx` — client component that calls `initDb()` on mount
- `src/app/import/page.tsx` — import landing (replaces placeholder)
- `src/app/import/ProfileWizard.tsx` — 5-step new profile wizard
- `src/app/import/ImportFlow.tsx` — 3-step import for existing profiles
- `src/app/transactions/page.tsx` — transactions table + category rules panel (replaces placeholder)
- `src/app/transactions/CategoryRulesPanel.tsx` — add/edit/delete/reorder rules
- `src-tauri/capabilities/default.json` — Tauri v2 capability with SQL permissions
- `tests/unit/lib/csv.test.ts`
- `tests/unit/lib/mapping.test.ts`
- `tests/unit/lib/rules.test.ts`
- `tests/unit/lib/duplicates.test.ts`
- `tests/components/import/ProfileWizard.test.tsx`
- `tests/components/import/ImportFlow.test.tsx`
- `tests/components/transactions/CategoryRulesPanel.test.tsx`

**Modify:**
- `src-tauri/Cargo.toml` — add `tauri-plugin-sql` with sqlite feature
- `src-tauri/src/lib.rs` — register SQL plugin
- `src/app/layout.tsx` — add `<AppInit />`
- `tests/setup.ts` — mock `@tauri-apps/plugin-sql`

---

## Task 1: Install tauri-plugin-sql and configure Tauri

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Install the npm package**

```bash
npm install @tauri-apps/plugin-sql
```

Expected output: package added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Add the Rust dependency**

In `src-tauri/Cargo.toml`, add to `[dependencies]`:

```toml
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
```

- [ ] **Step 3: Register the plugin in lib.rs**

Replace the entire contents of `src-tauri/src/lib.rs` with:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::new().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

- [ ] **Step 4: Create the capabilities file**

Create `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/schema/capability.json",
  "identifier": "default",
  "description": "Default app capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-load",
    "sql:allow-close"
  ]
}
```

- [ ] **Step 5: Verify Rust compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors. If `tauri-plugin-sql` version conflicts, check https://github.com/tauri-apps/plugins-workspace for the current v2 version and update `Cargo.toml` accordingly.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/capabilities/default.json package.json package-lock.json
git commit -m "feat: install and configure tauri-plugin-sql"
```

---

## Task 2: Define shared TypeScript types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create the types file**

Create `src/lib/types.ts`:

```typescript
export interface ColumnMap {
  date: string
  description: string
  amount: string
  transaction_type?: string
  memo?: string
  category?: string
}

export interface Profile {
  id: number
  name: string
  column_map: ColumnMap
  extra_column_map: Record<string, string>
  date_format: 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY'
  sign_convention: 'negative_expense' | 'positive_expense'
  created_at: string
}

export interface Transaction {
  id: number
  date: string
  description: string
  amount: number
  transaction_type: string | null
  memo: string | null
  category: string | null
  notes: string | null
  extra_data: Record<string, string> | null
  imported_at: string
  profile_id: number
}

export interface CategoryRule {
  id: number
  pattern: string
  category: string
  priority: number
}

export interface ParsedRow {
  date: string
  description: string
  amount: number
  transaction_type: string | null
  memo: string | null
  category: string | null
  extra_data: Record<string, string> | null
}

export interface MappingError {
  row: number
  message: string
}

export interface ImportResult {
  imported: number
  skipped_duplicates: number
  errors: MappingError[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Implement CSV parser

**Files:**
- Create: `src/lib/csv.ts`
- Create: `tests/unit/lib/csv.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/lib/csv.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseCsv, parseCsvLine } from '@/lib/csv'

describe('parseCsvLine', () => {
  it('splits a simple comma-separated line', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('handles quoted fields with commas inside', () => {
    expect(parseCsvLine('"hello, world",b,c')).toEqual(['hello, world', 'b', 'c'])
  })

  it('handles escaped quotes inside quoted fields', () => {
    expect(parseCsvLine('"say ""hi""",b')).toEqual(['say "hi"', 'b'])
  })

  it('trims whitespace from unquoted fields', () => {
    expect(parseCsvLine('a , b , c')).toEqual(['a', 'b', 'c'])
  })
})

describe('parseCsv', () => {
  it('returns headers and rows', () => {
    const csv = 'Date,Name,Amount\n01/01/2025,Netflix,-15.99\n01/02/2025,Walmart,-42.00'
    const result = parseCsv(csv)
    expect(result.headers).toEqual(['Date', 'Name', 'Amount'])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual(['01/01/2025', 'Netflix', '-15.99'])
  })

  it('skips empty lines', () => {
    const csv = 'Date,Amount\n01/01/2025,10.00\n\n01/02/2025,20.00'
    expect(parseCsv(csv).rows).toHaveLength(2)
  })

  it('returns empty arrays for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] })
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- tests/unit/lib/csv.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/csv'`

- [ ] **Step 3: Implement csv.ts**

Create `src/lib/csv.ts`:

```typescript
export function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n')
  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return { headers: [], rows: [] }
  }
  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).filter(l => l.trim() !== '').map(parseCsvLine)
  return { headers, rows }
}
```

- [ ] **Step 4: Run to verify passing**

```bash
npm run test:run -- tests/unit/lib/csv.test.ts
```

Expected: PASS — all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts tests/unit/lib/csv.test.ts
git commit -m "feat: add CSV parser with tests"
```

---

## Task 4: Implement column mapping

**Files:**
- Create: `src/lib/mapping.ts`
- Create: `tests/unit/lib/mapping.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/lib/mapping.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseDate, parseAmount, applyMapping } from '@/lib/mapping'
import type { Profile } from '@/lib/types'

describe('parseDate', () => {
  it('parses MM/DD/YYYY', () => {
    expect(parseDate('01/15/2025', 'MM/DD/YYYY')).toBe('2025-01-15')
  })

  it('parses YYYY-MM-DD', () => {
    expect(parseDate('2025-01-15', 'YYYY-MM-DD')).toBe('2025-01-15')
  })

  it('parses DD/MM/YYYY', () => {
    expect(parseDate('15/01/2025', 'DD/MM/YYYY')).toBe('2025-01-15')
  })

  it('returns null for invalid date', () => {
    expect(parseDate('not-a-date', 'MM/DD/YYYY')).toBeNull()
  })

  it('pads single-digit month and day', () => {
    expect(parseDate('1/5/2025', 'MM/DD/YYYY')).toBe('2025-01-05')
  })
})

describe('parseAmount', () => {
  it('stores positive value as-is when positive_expense', () => {
    expect(parseAmount('50.00', 'positive_expense')).toBe(50)
  })

  it('negates negative value when negative_expense (makes it positive = expense)', () => {
    expect(parseAmount('-50.00', 'negative_expense')).toBe(50)
  })

  it('strips currency symbols and commas', () => {
    expect(parseAmount('$1,234.56', 'positive_expense')).toBe(1234.56)
  })

  it('returns null for non-numeric input', () => {
    expect(parseAmount('N/A', 'positive_expense')).toBeNull()
  })
})

describe('applyMapping', () => {
  const profile: Pick<Profile, 'column_map' | 'extra_column_map' | 'date_format' | 'sign_convention'> = {
    column_map: {
      date: 'Date',
      description: 'Name',
      amount: 'Amount',
      transaction_type: 'Transaction',
      memo: 'Memo',
    },
    extra_column_map: {},
    date_format: 'MM/DD/YYYY',
    sign_convention: 'negative_expense',
  }

  it('maps a valid row', () => {
    const headers = ['Date', 'Transaction', 'Name', 'Memo', 'Amount']
    const rows = [['01/15/2025', 'Debit', 'Netflix', 'STREAMING', '-15.99']]
    const { rows: result, errors } = applyMapping(headers, rows, profile)
    expect(errors).toHaveLength(0)
    expect(result[0]).toMatchObject({
      date: '2025-01-15',
      description: 'Netflix',
      amount: 15.99,
      transaction_type: 'Debit',
      memo: 'STREAMING',
    })
  })

  it('returns an error for a row with invalid date', () => {
    const headers = ['Date', 'Transaction', 'Name', 'Memo', 'Amount']
    const rows = [['not-a-date', 'Debit', 'Netflix', '', '-15.99']]
    const { rows: result, errors } = applyMapping(headers, rows, profile)
    expect(result).toHaveLength(0)
    expect(errors[0].message).toMatch(/invalid date/)
  })

  it('maps extra columns to extra_data', () => {
    const profileWithExtra: typeof profile = {
      ...profile,
      extra_column_map: { 'Ref': 'ref_number' },
    }
    const headers = ['Date', 'Transaction', 'Name', 'Memo', 'Amount', 'Ref']
    const rows = [['01/15/2025', 'Debit', 'Netflix', '', '-15.99', 'ABC123']]
    const { rows: result } = applyMapping(headers, rows, profileWithExtra)
    expect(result[0].extra_data).toEqual({ ref_number: 'ABC123' })
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- tests/unit/lib/mapping.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/mapping'`

- [ ] **Step 3: Implement mapping.ts**

Create `src/lib/mapping.ts`:

```typescript
import type { Profile, ParsedRow, MappingError } from './types'

export interface MappingResult {
  rows: ParsedRow[]
  errors: MappingError[]
}

export function applyMapping(
  headers: string[],
  rows: string[][],
  profile: Pick<Profile, 'column_map' | 'extra_column_map' | 'date_format' | 'sign_convention'>
): MappingResult {
  const results: ParsedRow[] = []
  const errors: MappingError[] = []

  rows.forEach((row, i) => {
    const rowNum = i + 2
    const rowMap: Record<string, string> = {}
    headers.forEach((h, idx) => { rowMap[h] = row[idx] ?? '' })

    try {
      results.push(mapRow(rowMap, profile, rowNum))
    } catch (e) {
      errors.push({ row: rowNum, message: (e as Error).message })
    }
  })

  return { rows: results, errors }
}

function mapRow(
  rowMap: Record<string, string>,
  profile: Pick<Profile, 'column_map' | 'extra_column_map' | 'date_format' | 'sign_convention'>,
  rowNum: number
): ParsedRow {
  const col = profile.column_map

  const rawDate = getRequired(rowMap, col.date, 'date', rowNum)
  const rawDescription = getRequired(rowMap, col.description, 'description', rowNum)
  const rawAmount = getRequired(rowMap, col.amount, 'amount', rowNum)

  const date = parseDate(rawDate, profile.date_format)
  if (!date) throw new Error(`Row ${rowNum}: invalid date "${rawDate}"`)

  const amount = parseAmount(rawAmount, profile.sign_convention)
  if (amount === null) throw new Error(`Row ${rowNum}: invalid amount "${rawAmount}"`)

  const extra_data: Record<string, string> = {}
  for (const [csvCol, key] of Object.entries(profile.extra_column_map)) {
    if (rowMap[csvCol] !== undefined && rowMap[csvCol] !== '') {
      extra_data[key] = rowMap[csvCol]
    }
  }

  return {
    date,
    description: rawDescription,
    amount,
    transaction_type: col.transaction_type ? rowMap[col.transaction_type] || null : null,
    memo: col.memo ? rowMap[col.memo] || null : null,
    category: col.category ? rowMap[col.category] || null : null,
    extra_data: Object.keys(extra_data).length > 0 ? extra_data : null,
  }
}

function getRequired(
  rowMap: Record<string, string>,
  col: string,
  fieldName: string,
  rowNum: number
): string {
  const val = rowMap[col]
  if (val === undefined || val === '') {
    throw new Error(`Row ${rowNum}: missing required field "${fieldName}" (column "${col}")`)
  }
  return val
}

export function parseDate(raw: string, format: Profile['date_format']): string | null {
  let year: number, month: number, day: number

  if (format === 'MM/DD/YYYY') {
    const parts = raw.split('/')
    month = parseInt(parts[0]); day = parseInt(parts[1]); year = parseInt(parts[2])
  } else if (format === 'YYYY-MM-DD') {
    const parts = raw.split('-')
    year = parseInt(parts[0]); month = parseInt(parts[1]); day = parseInt(parts[2])
  } else {
    const parts = raw.split('/')
    day = parseInt(parts[0]); month = parseInt(parts[1]); year = parseInt(parts[2])
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseAmount(raw: string, convention: Profile['sign_convention']): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '')
  const val = parseFloat(cleaned)
  if (isNaN(val)) return null
  return convention === 'negative_expense' ? -val : val
}
```

- [ ] **Step 4: Run to verify passing**

```bash
npm run test:run -- tests/unit/lib/mapping.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mapping.ts tests/unit/lib/mapping.test.ts
git commit -m "feat: add column mapping logic with tests"
```

---

## Task 5: Implement category rules

**Files:**
- Create: `src/lib/rules.ts`
- Create: `tests/unit/lib/rules.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/lib/rules.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyRules, effectiveCategory } from '@/lib/rules'
import type { CategoryRule } from '@/lib/types'

const rules: CategoryRule[] = [
  { id: 1, pattern: 'NETFLIX', category: 'Entertainment', priority: 0 },
  { id: 2, pattern: 'WHOLEFDS', category: 'Groceries', priority: 1 },
  { id: 3, pattern: 'WHOLE', category: 'Other', priority: 2 },
]

describe('applyRules', () => {
  it('matches a rule case-insensitively', () => {
    expect(applyRules('netflix monthly', rules)).toBe('Entertainment')
  })

  it('returns the highest-priority (lowest number) match', () => {
    expect(applyRules('WHOLEFDS MARKET', rules)).toBe('Groceries')
  })

  it('returns null when no rule matches', () => {
    expect(applyRules('AMAZON PRIME', rules)).toBeNull()
  })

  it('matches partial substrings', () => {
    expect(applyRules('WHOLEFDS #999', rules)).toBe('Groceries')
  })
})

describe('effectiveCategory', () => {
  it('prefers CSV category over rules', () => {
    expect(effectiveCategory('Shopping', 'NETFLIX', rules)).toBe('Shopping')
  })

  it('falls back to rules when CSV category is null', () => {
    expect(effectiveCategory(null, 'NETFLIX purchase', rules)).toBe('Entertainment')
  })

  it('returns null when neither CSV category nor rules match', () => {
    expect(effectiveCategory(null, 'UNKNOWN MERCHANT', rules)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- tests/unit/lib/rules.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/rules'`

- [ ] **Step 3: Implement rules.ts**

Create `src/lib/rules.ts`:

```typescript
import type { CategoryRule } from './types'

export function applyRules(description: string, rules: CategoryRule[]): string | null {
  const lower = description.toLowerCase()
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)

  for (const rule of sorted) {
    if (lower.includes(rule.pattern.toLowerCase())) {
      return rule.category
    }
  }
  return null
}

export function effectiveCategory(
  csvCategory: string | null,
  description: string,
  rules: CategoryRule[]
): string | null {
  return csvCategory ?? applyRules(description, rules)
}
```

- [ ] **Step 4: Run to verify passing**

```bash
npm run test:run -- tests/unit/lib/rules.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rules.ts tests/unit/lib/rules.test.ts
git commit -m "feat: add category rule matching with tests"
```

---

## Task 6: Implement duplicate detection

**Files:**
- Create: `src/lib/duplicates.ts`
- Create: `tests/unit/lib/duplicates.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/lib/duplicates.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { detectDuplicates } from '@/lib/duplicates'
import type { Transaction, ParsedRow } from '@/lib/types'

const existing: Transaction[] = [
  {
    id: 1, date: '2025-01-15', description: 'Netflix', amount: 15.99,
    transaction_type: null, memo: null, category: null, notes: null,
    extra_data: null, imported_at: '2025-01-20T00:00:00Z', profile_id: 1,
  },
]

const makeRow = (overrides: Partial<ParsedRow> = {}): ParsedRow => ({
  date: '2025-01-15',
  description: 'Netflix',
  amount: 15.99,
  transaction_type: null,
  memo: null,
  category: null,
  extra_data: null,
  ...overrides,
})

describe('detectDuplicates', () => {
  it('flags a row that matches date + description + amount', () => {
    expect(detectDuplicates([makeRow()], existing)).toEqual([true])
  })

  it('does not flag a row with different amount', () => {
    expect(detectDuplicates([makeRow({ amount: 20.00 })], existing)).toEqual([false])
  })

  it('does not flag a row with different description', () => {
    expect(detectDuplicates([makeRow({ description: 'Hulu' })], existing)).toEqual([false])
  })

  it('handles multiple rows correctly', () => {
    const rows = [makeRow(), makeRow({ amount: 20.00 })]
    expect(detectDuplicates(rows, existing)).toEqual([true, false])
  })

  it('returns all false when existing is empty', () => {
    expect(detectDuplicates([makeRow()], [])).toEqual([false])
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- tests/unit/lib/duplicates.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/duplicates'`

- [ ] **Step 3: Implement duplicates.ts**

Create `src/lib/duplicates.ts`:

```typescript
import type { Transaction, ParsedRow } from './types'

export function detectDuplicates(
  incoming: ParsedRow[],
  existing: Transaction[]
): boolean[] {
  const existingKeys = new Set(
    existing.map(t => `${t.date}|${t.description}|${t.amount}`)
  )
  return incoming.map(row =>
    existingKeys.has(`${row.date}|${row.description}|${row.amount}`)
  )
}
```

- [ ] **Step 4: Run to verify passing**

```bash
npm run test:run -- tests/unit/lib/duplicates.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/duplicates.ts tests/unit/lib/duplicates.test.ts
git commit -m "feat: add duplicate detection with tests"
```

---

## Task 7: Implement db.ts and wire up app init

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/app/AppInit.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `tests/setup.ts`

- [ ] **Step 1: Add mock for @tauri-apps/plugin-sql in test setup**

Replace the contents of `tests/setup.ts` with:

```typescript
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: vi.fn().mockResolvedValue({
      execute: vi.fn().mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 }),
      select: vi.fn().mockResolvedValue([]),
    }),
  },
}))
```

- [ ] **Step 2: Create db.ts**

Create `src/lib/db.ts`:

```typescript
import Database from '@tauri-apps/plugin-sql'
import type { Profile, Transaction, CategoryRule } from './types'

let _db: Database | null = null

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
  return result.lastInsertId
}

export async function deleteProfile(id: number): Promise<void> {
  const db = await getDb()
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
```

- [ ] **Step 3: Create AppInit component**

Create `src/app/AppInit.tsx`:

```tsx
'use client'
import { useEffect } from 'react'
import { initDb } from '@/lib/db'

export default function AppInit() {
  useEffect(() => {
    initDb().catch(console.error)
  }, [])
  return null
}
```

- [ ] **Step 4: Add AppInit to the root layout**

In `src/app/layout.tsx`, add the import and render `<AppInit />` inside `<body>` before `<aside>`:

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import AppInit from "./AppInit";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Simple Budget",
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/import", label: "Import" },
  { href: "/transactions", label: "Transactions" },
  { href: "/categories", label: "Categories" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full flex antialiased bg-gray-50 text-gray-900">
        <AppInit />
        <aside className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-5 py-5 border-b border-gray-200">
            <span className="text-base font-semibold tracking-tight text-gray-900">
              Simple Budget
            </span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Run all existing tests to confirm nothing broken**

```bash
npm run test:run
```

Expected: all existing tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts src/app/AppInit.tsx src/app/layout.tsx tests/setup.ts
git commit -m "feat: add database layer and app init"
```

---

## Task 8: Import landing page

**Files:**
- Modify: `src/app/import/page.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace `src/app/import/page.tsx` with:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { getProfiles, deleteProfile } from '@/lib/db'
import type { Profile } from '@/lib/types'
import ProfileWizard from './ProfileWizard'
import ImportFlow from './ImportFlow'

type Mode =
  | { type: 'landing' }
  | { type: 'wizard' }
  | { type: 'import'; profile: Profile }

export default function ImportPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [mode, setMode] = useState<Mode>({ type: 'landing' })

  async function loadProfiles() {
    setProfiles(await getProfiles())
  }

  useEffect(() => { loadProfiles() }, [])

  if (mode.type === 'wizard') {
    return (
      <ProfileWizard
        onComplete={() => { loadProfiles(); setMode({ type: 'landing' }) }}
        onCancel={() => setMode({ type: 'landing' })}
      />
    )
  }

  if (mode.type === 'import') {
    return (
      <ImportFlow
        profile={mode.profile}
        onComplete={() => setMode({ type: 'landing' })}
        onCancel={() => setMode({ type: 'landing' })}
      />
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Import</h1>
        <button
          onClick={() => setMode({ type: 'wizard' })}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
        >
          New Profile
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No import profiles yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-w-xl">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
            >
              <span className="text-sm font-medium text-gray-900">{profile.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode({ type: 'import', profile })}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Import CSV
                </button>
                <button
                  onClick={async () => {
                    await deleteProfile(profile.id)
                    loadProfiles()
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/import/page.tsx
git commit -m "feat: add import landing page"
```

---

## Task 9: Profile wizard component

**Files:**
- Create: `src/app/import/ProfileWizard.tsx`
- Create: `tests/components/import/ProfileWizard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/import/ProfileWizard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils'
import ProfileWizard from '@/app/import/ProfileWizard'

vi.mock('@/lib/db', () => ({
  saveProfile: vi.fn().mockResolvedValue(1),
}))

const onComplete = vi.fn()
const onCancel = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProfileWizard', () => {
  it('renders step 1 with a name input', () => {
    render(<ProfileWizard onComplete={onComplete} onCancel={onCancel} />)
    expect(screen.getByRole('heading', { name: /new profile/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/profile name/i)).toBeInTheDocument()
  })

  it('disables Next on step 1 when name is empty', () => {
    render(<ProfileWizard onComplete={onComplete} onCancel={onCancel} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('enables Next on step 1 when name is filled', () => {
    render(<ProfileWizard onComplete={onComplete} onCancel={onCancel} />)
    fireEvent.change(screen.getByLabelText(/profile name/i), {
      target: { value: 'Chase Freedom' },
    })
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })

  it('calls onCancel when Cancel is clicked', () => {
    render(<ProfileWizard onComplete={onComplete} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- tests/components/import/ProfileWizard.test.tsx
```

Expected: FAIL — `Cannot find module '@/app/import/ProfileWizard'`

- [ ] **Step 3: Implement ProfileWizard.tsx**

Create `src/app/import/ProfileWizard.tsx`:

```tsx
'use client'
import { useReducer, useRef } from 'react'
import { parseCsv } from '@/lib/csv'
import { applyMapping } from '@/lib/mapping'
import { saveProfile } from '@/lib/db'
import type { Profile, ColumnMap } from '@/lib/types'

type WizardState = {
  step: 1 | 2 | 3 | 4 | 5
  name: string
  headers: string[]
  previewRows: string[][]
  columnMap: Partial<ColumnMap>
  extraColumnMap: Record<string, string>
  dateFormat: Profile['date_format']
  signConvention: Profile['sign_convention']
}

type WizardAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_CSV'; headers: string[]; previewRows: string[][] }
  | { type: 'SET_COLUMN'; field: keyof ColumnMap; csvColumn: string }
  | { type: 'SET_EXTRA_COLUMN'; csvColumn: string; key: string }
  | { type: 'REMOVE_EXTRA_COLUMN'; csvColumn: string }
  | { type: 'SET_DATE_FORMAT'; value: Profile['date_format'] }
  | { type: 'SET_SIGN_CONVENTION'; value: Profile['sign_convention'] }
  | { type: 'NEXT' }
  | { type: 'BACK' }

const initialState: WizardState = {
  step: 1,
  name: '',
  headers: [],
  previewRows: [],
  columnMap: {},
  extraColumnMap: {},
  dateFormat: 'MM/DD/YYYY',
  signConvention: 'negative_expense',
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.name }
    case 'SET_CSV': return { ...state, headers: action.headers, previewRows: action.previewRows }
    case 'SET_COLUMN': return {
      ...state,
      columnMap: { ...state.columnMap, [action.field]: action.csvColumn || undefined },
    }
    case 'SET_EXTRA_COLUMN': return {
      ...state,
      extraColumnMap: { ...state.extraColumnMap, [action.csvColumn]: action.key },
    }
    case 'REMOVE_EXTRA_COLUMN': {
      const next = { ...state.extraColumnMap }
      delete next[action.csvColumn]
      return { ...state, extraColumnMap: next }
    }
    case 'SET_DATE_FORMAT': return { ...state, dateFormat: action.value }
    case 'SET_SIGN_CONVENTION': return { ...state, signConvention: action.value }
    case 'NEXT': return { ...state, step: (state.step + 1) as WizardState['step'] }
    case 'BACK': return { ...state, step: (state.step - 1) as WizardState['step'] }
    default: return state
  }
}

const REQUIRED_FIELDS: (keyof ColumnMap)[] = ['date', 'description', 'amount']
const OPTIONAL_FIELDS: (keyof ColumnMap)[] = ['transaction_type', 'memo', 'category']
const FIELD_LABELS: Record<keyof ColumnMap, string> = {
  date: 'Date',
  description: 'Description',
  amount: 'Amount',
  transaction_type: 'Transaction Type',
  memo: 'Memo',
  category: 'Category',
}

interface Props {
  onComplete: () => void
  onCancel: () => void
}

export default function ProfileWizard({ onComplete, onCancel }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const fileRef = useRef<HTMLInputElement>(null)

  function canAdvance(): boolean {
    if (state.step === 1) return state.name.trim().length > 0
    if (state.step === 2) return state.headers.length > 0
    if (state.step === 3) return REQUIRED_FIELDS.every(f => state.columnMap[f])
    return true
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const { headers, rows } = parseCsv(text)
    dispatch({ type: 'SET_CSV', headers, previewRows: rows.slice(0, 3) })
  }

  async function handleSave() {
    const profile: Omit<Profile, 'id' | 'created_at'> = {
      name: state.name.trim(),
      column_map: state.columnMap as ColumnMap,
      extra_column_map: state.extraColumnMap,
      date_format: state.dateFormat,
      sign_convention: state.signConvention,
    }
    await saveProfile(profile)
    onComplete()
  }

  const mappedCsvColumns = new Set([
    ...Object.values(state.columnMap).filter(Boolean),
    ...Object.keys(state.extraColumnMap),
  ])

  const unmappedHeaders = state.headers.filter(h => !mappedCsvColumns.has(h))

  const previewProfile = {
    column_map: state.columnMap as ColumnMap,
    extra_column_map: state.extraColumnMap,
    date_format: state.dateFormat,
    sign_convention: state.signConvention,
  }
  const { rows: previewParsed } = state.previewRows.length > 0
    ? applyMapping(state.headers, state.previewRows, previewProfile)
    : { rows: [] }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">New Profile</h1>
      <p className="text-sm text-gray-500 mb-6">Step {state.step} of 5</p>

      {state.step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Profile name</span>
            <input
              type="text"
              id="profile-name"
              placeholder="e.g. Chase Freedom"
              value={state.name}
              onChange={e => dispatch({ type: 'SET_NAME', name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </label>
        </div>
      )}

      {state.step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a sample CSV from this provider. We'll detect the columns.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block text-sm text-gray-600"
          />
          {state.headers.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Detected columns</p>
              <div className="flex flex-wrap gap-1">
                {state.headers.map(h => (
                  <span key={h} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {state.step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            Match each field to the corresponding CSV column.
          </p>
          {REQUIRED_FIELDS.map(field => (
            <label key={field} className="block">
              <span className="text-sm font-medium text-gray-700">
                {FIELD_LABELS[field]} <span className="text-red-500">*</span>
              </span>
              <select
                value={state.columnMap[field] ?? ''}
                onChange={e => dispatch({ type: 'SET_COLUMN', field, csvColumn: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">— select column —</option>
                {state.headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
          ))}
          {OPTIONAL_FIELDS.map(field => (
            <label key={field} className="block">
              <span className="text-sm font-medium text-gray-700">{FIELD_LABELS[field]}</span>
              <select
                value={state.columnMap[field] ?? ''}
                onChange={e => dispatch({ type: 'SET_COLUMN', field, csvColumn: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">— skip —</option>
                {state.headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
          ))}
          {unmappedHeaders.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Extra columns (optional)</p>
              {unmappedHeaders.map(h => (
                <div key={h} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 w-32 truncate">{h}</span>
                  <input
                    type="text"
                    placeholder="key name (or leave blank to skip)"
                    value={state.extraColumnMap[h] ?? ''}
                    onChange={e => {
                      if (e.target.value) {
                        dispatch({ type: 'SET_EXTRA_COLUMN', csvColumn: h, key: e.target.value })
                      } else {
                        dispatch({ type: 'REMOVE_EXTRA_COLUMN', csvColumn: h })
                      }
                    }}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {state.step === 4 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Date format</span>
            <select
              value={state.dateFormat}
              onChange={e => dispatch({ type: 'SET_DATE_FORMAT', value: e.target.value as Profile['date_format'] })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Amount sign convention</span>
            <select
              value={state.signConvention}
              onChange={e => dispatch({ type: 'SET_SIGN_CONVENTION', value: e.target.value as Profile['sign_convention'] })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="negative_expense">Expenses are negative (e.g. -15.99)</option>
              <option value="positive_expense">Expenses are positive (e.g. 15.99)</option>
            </select>
          </label>
        </div>
      )}

      {state.step === 5 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Preview of first {previewParsed.length} row(s):</p>
          {previewParsed.length === 0 ? (
            <p className="text-sm text-gray-400">No rows to preview.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewParsed.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-700">{row.date}</td>
                      <td className="px-3 py-2 text-gray-700">{row.description}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        {state.step > 1 && (
          <button
            onClick={() => dispatch({ type: 'BACK' })}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        )}
        {state.step < 5 ? (
          <button
            onClick={() => dispatch({ type: 'NEXT' })}
            disabled={!canAdvance()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Save Profile
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run -- tests/components/import/ProfileWizard.test.tsx
```

Expected: PASS — all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/import/ProfileWizard.tsx tests/components/import/ProfileWizard.test.tsx
git commit -m "feat: add profile wizard component"
```

---

## Task 10: Import flow component

**Files:**
- Create: `src/app/import/ImportFlow.tsx`
- Create: `tests/components/import/ImportFlow.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/import/ImportFlow.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../utils'
import ImportFlow from '@/app/import/ImportFlow'
import type { Profile } from '@/lib/types'

vi.mock('@/lib/db', () => ({
  getTransactions: vi.fn().mockResolvedValue([]),
  insertTransactions: vi.fn().mockResolvedValue(undefined),
}))

const profile: Profile = {
  id: 1,
  name: 'Chase Freedom',
  column_map: { date: 'Date', description: 'Name', amount: 'Amount' },
  extra_column_map: {},
  date_format: 'MM/DD/YYYY',
  sign_convention: 'negative_expense',
  created_at: '2025-01-01T00:00:00Z',
}

const onComplete = vi.fn()
const onCancel = vi.fn()

beforeEach(() => { vi.clearAllMocks() })

describe('ImportFlow', () => {
  it('renders step 1 with a file input', () => {
    render(<ImportFlow profile={profile} onComplete={onComplete} onCancel={onCancel} />)
    expect(screen.getByText(/chase freedom/i)).toBeInTheDocument()
    expect(screen.getByText(/upload/i)).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', () => {
    render(<ImportFlow profile={profile} onComplete={onComplete} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- tests/components/import/ImportFlow.test.tsx
```

Expected: FAIL — `Cannot find module '@/app/import/ImportFlow'`

- [ ] **Step 3: Implement ImportFlow.tsx**

Create `src/app/import/ImportFlow.tsx`:

```tsx
'use client'
import { useReducer, useRef, useEffect } from 'react'
import { parseCsv } from '@/lib/csv'
import { applyMapping } from '@/lib/mapping'
import { detectDuplicates } from '@/lib/duplicates'
import { getTransactions, insertTransactions } from '@/lib/db'
import type { Profile, ParsedRow, MappingError, ImportResult, Transaction } from '@/lib/types'

type ImportState = {
  step: 1 | 2 | 3
  parsedRows: ParsedRow[]
  parseErrors: MappingError[]
  duplicateFlags: boolean[]
  skipFlags: boolean[]
  result: ImportResult | null
  existing: Transaction[]
}

type ImportAction =
  | { type: 'SET_EXISTING'; rows: Transaction[] }
  | { type: 'PARSED'; rows: ParsedRow[]; errors: MappingError[]; duplicates: boolean[] }
  | { type: 'TOGGLE_SKIP'; index: number }
  | { type: 'SET_RESULT'; result: ImportResult }
  | { type: 'RESET' }

function reducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'SET_EXISTING': return { ...state, existing: action.rows }
    case 'PARSED': return {
      ...state,
      step: 2,
      parsedRows: action.rows,
      parseErrors: action.errors,
      duplicateFlags: action.duplicates,
      skipFlags: action.duplicates.map(d => d),
    }
    case 'TOGGLE_SKIP': {
      const next = [...state.skipFlags]
      next[action.index] = !next[action.index]
      return { ...state, skipFlags: next }
    }
    case 'SET_RESULT': return { ...state, step: 3, result: action.result }
    case 'RESET': return { ...initialState, existing: state.existing }
    default: return state
  }
}

const initialState: ImportState = {
  step: 1,
  parsedRows: [],
  parseErrors: [],
  duplicateFlags: [],
  skipFlags: [],
  result: null,
  existing: [],
}

interface Props {
  profile: Profile
  onComplete: () => void
  onCancel: () => void
}

export default function ImportFlow({ profile, onComplete, onCancel }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getTransactions().then(rows => dispatch({ type: 'SET_EXISTING', rows }))
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const { headers, rows } = parseCsv(text)
    const { rows: parsed, errors } = applyMapping(headers, rows, profile)
    const duplicates = detectDuplicates(parsed, state.existing)
    dispatch({ type: 'PARSED', rows: parsed, errors, duplicates })
  }

  async function handleConfirm() {
    const toInsert = state.parsedRows
      .filter((_, i) => !state.skipFlags[i])
      .map(r => ({ ...r, notes: null, profile_id: profile.id }))

    await insertTransactions(toInsert)

    const result: ImportResult = {
      imported: toInsert.length,
      skipped_duplicates: state.skipFlags.filter(Boolean).length,
      errors: state.parseErrors,
    }
    dispatch({ type: 'SET_RESULT', result })
  }

  if (state.step === 3 && state.result) {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Import Complete</h1>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Imported</span>
            <span className="text-sm font-medium text-gray-900">{state.result.imported}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Skipped duplicates</span>
            <span className="text-sm font-medium text-gray-900">{state.result.skipped_duplicates}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Errors</span>
            <span className="text-sm font-medium text-gray-900">{state.result.errors.length}</span>
          </div>
        </div>
        {state.result.errors.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Error details</p>
            <ul className="space-y-1">
              {state.result.errors.map((e, i) => (
                <li key={i} className="text-xs text-red-600">Row {e.row}: {e.message}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={onComplete}
          className="mt-6 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Done
        </button>
      </div>
    )
  }

  if (state.step === 2) {
    const toImportCount = state.skipFlags.filter(f => !f).length
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Review Import</h1>
        <p className="text-sm text-gray-500 mb-4">
          {state.parsedRows.length} rows parsed · {state.duplicateFlags.filter(Boolean).length} likely duplicates
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Import</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.parsedRows.map((row, i) => (
                <tr key={i} className={state.skipFlags[i] ? 'opacity-40' : ''}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!state.skipFlags[i]}
                      onChange={() => dispatch({ type: 'TOGGLE_SKIP', index: i })}
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-700">{row.date}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{row.description}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{row.amount.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {state.duplicateFlags[i] && (
                      <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                        duplicate
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={toImportCount === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Import {toImportCount} transaction{toImportCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Upload</h1>
      <p className="text-sm text-gray-500 mb-6">Profile: {profile.name}</p>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="block text-sm text-gray-600 mb-6"
      />
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run -- tests/components/import/ImportFlow.test.tsx
```

Expected: PASS — both tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/import/ImportFlow.tsx tests/components/import/ImportFlow.test.tsx
git commit -m "feat: add import flow component"
```

---

## Task 11: Transactions page with category rules panel

**Files:**
- Modify: `src/app/transactions/page.tsx`
- Create: `src/app/transactions/CategoryRulesPanel.tsx`
- Create: `tests/components/transactions/CategoryRulesPanel.test.tsx`

- [ ] **Step 1: Write failing tests for CategoryRulesPanel**

Create `tests/components/transactions/CategoryRulesPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils'
import CategoryRulesPanel from '@/app/transactions/CategoryRulesPanel'
import type { CategoryRule } from '@/lib/types'

vi.mock('@/lib/db', () => ({
  saveCategoryRules: vi.fn().mockResolvedValue(undefined),
}))

const rules: CategoryRule[] = [
  { id: 1, pattern: 'NETFLIX', category: 'Entertainment', priority: 0 },
]

const onChange = vi.fn()

beforeEach(() => { vi.clearAllMocks() })

describe('CategoryRulesPanel', () => {
  it('renders existing rules', () => {
    render(<CategoryRulesPanel rules={rules} onChange={onChange} />)
    expect(screen.getByDisplayValue('NETFLIX')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Entertainment')).toBeInTheDocument()
  })

  it('adds a new empty rule when Add Rule is clicked', () => {
    render(<CategoryRulesPanel rules={rules} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    const patternInputs = screen.getAllByPlaceholderText(/pattern/i)
    expect(patternInputs).toHaveLength(2)
  })

  it('calls onChange with updated rules after save', async () => {
    const { saveCategoryRules } = await import('@/lib/db')
    render(<CategoryRulesPanel rules={rules} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /save rules/i }))
    await waitFor(() => expect(saveCategoryRules).toHaveBeenCalled())
    expect(onChange).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- tests/components/transactions/CategoryRulesPanel.test.tsx
```

Expected: FAIL — `Cannot find module '@/app/transactions/CategoryRulesPanel'`

- [ ] **Step 3: Implement CategoryRulesPanel.tsx**

Create `src/app/transactions/CategoryRulesPanel.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { saveCategoryRules } from '@/lib/db'
import type { CategoryRule } from '@/lib/types'

type DraftRule = Omit<CategoryRule, 'id'>

interface Props {
  rules: CategoryRule[]
  onChange: () => void
}

export default function CategoryRulesPanel({ rules, onChange }: Props) {
  const [drafts, setDrafts] = useState<DraftRule[]>(
    rules.map(r => ({ pattern: r.pattern, category: r.category, priority: r.priority }))
  )

  function addRule() {
    setDrafts(d => [...d, { pattern: '', category: '', priority: d.length }])
  }

  function removeRule(i: number) {
    setDrafts(d => d.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, priority: idx })))
  }

  function updateRule(i: number, field: 'pattern' | 'category', value: string) {
    setDrafts(d => d.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  async function handleSave() {
    const valid = drafts.filter(r => r.pattern.trim() && r.category.trim())
    await saveCategoryRules(valid)
    onChange()
  }

  return (
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
            onChange={e => updateRule(i, 'pattern', e.target.value)}
            className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="text"
            placeholder="Category"
            value={rule.category}
            onChange={e => updateRule(i, 'category', e.target.value)}
            className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
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
  )
}
```

- [ ] **Step 4: Run CategoryRulesPanel tests**

```bash
npm run test:run -- tests/components/transactions/CategoryRulesPanel.test.tsx
```

Expected: PASS — all 3 tests.

- [ ] **Step 5: Replace transactions page**

Replace `src/app/transactions/page.tsx` with:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { getTransactions, getCategoryRules } from '@/lib/db'
import { effectiveCategory } from '@/lib/rules'
import type { Transaction, CategoryRule } from '@/lib/types'
import CategoryRulesPanel from './CategoryRulesPanel'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [showRules, setShowRules] = useState(false)

  async function load() {
    const [txns, rls] = await Promise.all([getTransactions(), getCategoryRules()])
    setTransactions(txns)
    setRules(rls)
  }

  useEffect(() => { load() }, [])

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
          <CategoryRulesPanel rules={rules} onChange={load} />
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
```

- [ ] **Step 6: Run all tests**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/transactions/page.tsx src/app/transactions/CategoryRulesPanel.tsx tests/components/transactions/CategoryRulesPanel.test.tsx
git commit -m "feat: add transactions page and category rules panel"
```

---

## Task 12: Verify the full app builds

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 2: Verify Next.js build succeeds**

```bash
npm run build
```

Expected: build completes with no type errors. If TypeScript errors appear, fix them before proceeding.

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "fix: resolve any build-time type errors"
```
