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
