import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import DemoApp from './DemoApp'

beforeEach(() => localStorage.clear())

describe('local workspace', () => {
  it('lets a visitor vote once and preserves the disabled choice after a remount', () => {
    const first = render(<DemoApp />)
    fireEvent.click(screen.getByRole('button', { name: 'A clear first-week checklist' }))
    expect(screen.getByRole('status')).toHaveTextContent('recorded in this browser')
    expect(screen.getByRole('button', { name: 'A short product walkthrough' })).toBeDisabled()
    first.unmount()
    render(<DemoApp />)
    expect(screen.getByRole('button', { name: 'A clear first-week checklist, your vote' })).toBeDisabled()
    expect(screen.getByText('37', { selector: '.response-summary > strong' })).toBeVisible()
  })

  it('shows an actionable validation error without discarding the typed question', () => {
    render(<DemoApp />)
    fireEvent.click(screen.getByRole('button', { name: '+ Create a question' }))
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Which day works best?' } })
    fireEvent.change(screen.getByLabelText('Answer choices'), { target: { value: 'Monday\n monday' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create question' }))
    expect(screen.getByRole('alert')).toHaveTextContent('different label')
    expect(screen.getByLabelText('Question')).toHaveValue('Which day works best?')
  })
})
