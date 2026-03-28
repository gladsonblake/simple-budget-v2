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
