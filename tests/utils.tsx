import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'

// Extend this wrapper with providers (e.g. context, state management) as the app grows.
function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { ...options })
}

export * from '@testing-library/react'
export { customRender as render }
