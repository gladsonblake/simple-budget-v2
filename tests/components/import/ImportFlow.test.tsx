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
