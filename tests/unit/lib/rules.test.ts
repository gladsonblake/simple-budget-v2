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
