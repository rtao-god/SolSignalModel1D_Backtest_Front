import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import AppLink from './Link'
import { scrollToAnchor } from '@/shared/ui/SectionPager/lib/scrollToAnchor'

vi.mock('@/shared/ui/SectionPager/lib/scrollToAnchor', () => ({
    scrollToAnchor: vi.fn()
}))

describe('AppLink hash navigation', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        document.body.innerHTML = '<div id="main-proof"></div>'
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback =>
            window.setTimeout(() => callback(0), 0)
        )
    })

    afterEach(() => {
        vi.runOnlyPendingTimers()
        vi.useRealTimers()
        vi.restoreAllMocks()
        document.body.innerHTML = ''
    })

    test('schedules anchor scrolling for hash links', () => {
        render(
            <MemoryRouter>
                <AppLink to='/#main-proof'>Proof</AppLink>
            </MemoryRouter>
        )

        fireEvent.click(screen.getByRole('link', { name: 'Proof' }))
        vi.runAllTimers()

        expect(scrollToAnchor).toHaveBeenCalledWith('main-proof', {
            behavior: 'smooth'
        })
    })
})
