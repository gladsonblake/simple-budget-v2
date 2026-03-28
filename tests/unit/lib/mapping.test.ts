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
