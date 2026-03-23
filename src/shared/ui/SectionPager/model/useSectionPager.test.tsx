import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { render } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { vi } from 'vitest'
import { useSectionPager } from './useSectionPager'
import { dispatchInternalRouteTransition } from '@/shared/lib/navigation/internalRouteTransition'

const scrollToAnchorMock = vi.fn()

vi.mock('../lib/scrollToAnchor', () => ({
    scrollToAnchor: (...args: unknown[]) => scrollToAnchorMock(...args)
}))

function UseSectionPagerHarness() {
    const location = useLocation()
    const { handleNext, canNext } = useSectionPager({
        sections: [
            { id: 'section-1', anchor: 'section-1' },
            { id: 'section-2', anchor: 'section-2' }
        ],
        syncHash: true,
        trackScroll: false
    })

    return (
        <div>
            <button type='button' onClick={handleNext} disabled={!canNext}>
                next
            </button>
            <div data-testid='location-state'>{`${location.pathname}${location.search}${location.hash}`}</div>
            <div id='section-1' />
            <div id='section-2' />
        </div>
    )
}

function UseSectionPagerCanonicalHarness() {
    const location = useLocation()
    const [canonicalAnchor, setCanonicalAnchor] = useState<string | null>(null)

    useSectionPager({
        sections: [
            { id: 'section-1', anchor: 'section-1' },
            { id: 'section-2', anchor: 'section-2' }
        ],
        syncHash: true,
        trackScroll: false,
        canonicalAnchor
    })

    return (
        <div>
            <button type='button' onClick={() => setCanonicalAnchor('section-2')}>
                canonicalize
            </button>
            <div data-testid='location-state'>{`${location.pathname}${location.search}${location.hash}`}</div>
            <div id='section-1' />
            <div id='section-2' />
        </div>
    )
}

describe('useSectionPager', () => {
    test('keeps current search params when pager changes hash', async () => {
        scrollToAnchorMock.mockReset()

        render(<UseSectionPagerHarness />, {
            route: '/analysis/policy-branch-mega?slmode=with-sl&tpsl=dynamic#section-1'
        })

        fireEvent.click(screen.getByRole('button', { name: 'next' }))

        await waitFor(() => {
            expect(screen.getByTestId('location-state')).toHaveTextContent(
                '/analysis/policy-branch-mega?slmode=with-sl&tpsl=dynamic#section-2'
            )
        })

        expect(scrollToAnchorMock).toHaveBeenCalledWith(
            'section-2',
            expect.objectContaining({
                behavior: 'smooth',
                withTransitionPulse: true
            })
        )
    })

    test('normalizes hash through canonical anchor inside the same document owner', async () => {
        render(<UseSectionPagerCanonicalHarness />, {
            route: '/analysis/policy-branch-mega?bucket=daily#section-1'
        })

        fireEvent.click(screen.getByRole('button', { name: 'canonicalize' }))

        await waitFor(() => {
            expect(screen.getByTestId('location-state')).toHaveTextContent(
                '/analysis/policy-branch-mega?bucket=daily#section-2'
            )
        })
    })

    test('pauses hash canonicalization while a cross-document route transition is pending', async () => {
        render(<UseSectionPagerCanonicalHarness />, {
            route: '/analysis/policy-branch-mega?bucket=daily#section-1'
        })

        dispatchInternalRouteTransition({
            pathname: '/analysis/policy-setups/ps-1',
            search: '',
            hash: '',
            sameDocument: false
        })

        fireEvent.click(screen.getByRole('button', { name: 'canonicalize' }))

        await waitFor(() => {
            expect(screen.getByTestId('location-state')).toHaveTextContent(
                '/analysis/policy-branch-mega?bucket=daily#section-1'
            )
        })
    })
})
