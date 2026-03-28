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
