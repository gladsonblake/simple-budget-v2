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
