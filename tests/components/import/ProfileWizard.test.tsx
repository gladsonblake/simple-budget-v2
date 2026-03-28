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
