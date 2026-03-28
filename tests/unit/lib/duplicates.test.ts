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
