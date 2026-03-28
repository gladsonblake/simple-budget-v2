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
