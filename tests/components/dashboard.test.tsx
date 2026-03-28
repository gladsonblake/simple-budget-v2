import { describe, it, expect } from 'vitest'
import { render, screen } from '../utils'
import DashboardPage from '@/app/dashboard/page'

describe('DashboardPage', () => {
  it('renders the dashboard heading', () => {
    render(<DashboardPage />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})
