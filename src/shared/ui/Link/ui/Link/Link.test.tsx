import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import AppLink from './Link'
import { scrollToAnchor } from '@/shared/ui/SectionPager/lib/scrollToAnchor'
import { INTERNAL_ROUTE_TRANSITION_EVENT } from '@/shared/lib/navigation/internalRouteTransition'

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

    test('dispatches cross-document route transition intent for ordinary route links', () => {
        const transitionListener = vi.fn()
        window.addEventListener(INTERNAL_ROUTE_TRANSITION_EVENT, transitionListener as EventListener)

        render(
            <MemoryRouter initialEntries={['/analysis/policy-branch-mega?bucket=daily#section-1']}>
                <AppLink to='/analysis/policy-setups/ps-1'>Open graph</AppLink>
            </MemoryRouter>
        )

        fireEvent.click(screen.getByRole('link', { name: 'Open graph' }))

        expect(transitionListener).toHaveBeenCalledTimes(1)
        const transitionEvent = transitionListener.mock.calls[0][0] as CustomEvent<{
            pathname: string
            search: string
            hash: string
            sameDocument: boolean
        }>
        expect(transitionEvent.detail).toEqual({
            pathname: '/analysis/policy-setups/ps-1',
            search: '',
            hash: '',
            sameDocument: false
        })

        window.removeEventListener(INTERNAL_ROUTE_TRANSITION_EVENT, transitionListener as EventListener)
    })
})
