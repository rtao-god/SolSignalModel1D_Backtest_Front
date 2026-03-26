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

function UseSectionPagerNoScrollHarness() {
    const location = useLocation()

    useSectionPager({
        sections: [
            { id: 'section-1', anchor: 'section-1' },
            { id: 'section-2', anchor: 'section-2' }
        ],
        syncHash: true,
        trackScroll: false
    })

    return (
        <div className='app' data-testid='scroll-root'>
            <div data-testid='location-state'>{`${location.pathname}${location.search}${location.hash}`}</div>
            <div id='section-1' style={{ height: 2000 }} />
            <div id='section-2' style={{ height: 2000 }} />
        </div>
    )
}

function UseSectionPagerScrollHarness() {
    const location = useLocation()
    const { currentIndex } = useSectionPager({
        sections: [
            { id: 'section-1', anchor: 'section-1' },
            { id: 'section-2', anchor: 'section-2' },
            { id: 'section-3', anchor: 'section-3' }
        ],
        syncHash: false,
        trackScroll: true
    })

    return (
        <div className='app' data-testid='scroll-root'>
            <div data-testid='current-index'>{currentIndex}</div>
            <div data-testid='location-state'>{`${location.pathname}${location.search}${location.hash}`}</div>
            <div id='section-1' style={{ height: 800 }} />
            <div id='section-2' style={{ height: 800 }} />
            <div id='section-3' style={{ height: 800 }} />
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

    test('does not sync hash on scroll when trackScroll is disabled', async () => {
        render(<UseSectionPagerNoScrollHarness />, {
            route: '/analysis/policy-branch-mega'
        })

        fireEvent.scroll(screen.getByTestId('scroll-root'))

        await waitFor(() => {
            expect(screen.getByTestId('location-state')).toHaveTextContent('/analysis/policy-branch-mega')
        })
    })

    test('tracks the visible section index on scroll without changing hash', async () => {
        const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
            this: HTMLElement
        ) {
            const scrollTop = document.querySelector('.app') instanceof HTMLElement ? document.querySelector('.app')!.scrollTop : 0

            if (this.classList.contains('app')) {
                return {
                    x: 0,
                    y: 0,
                    top: 0,
                    left: 0,
                    right: 1200,
                    bottom: 800,
                    width: 1200,
                    height: 800,
                    toJSON: () => ({})
                } as DOMRect
            }

            const sectionBaseTop = this.id === 'section-1' ? 0 : this.id === 'section-2' ? 1400 : 2800
            const sectionTop = sectionBaseTop - scrollTop
            return {
                x: 0,
                y: sectionTop,
                top: sectionTop,
                left: 0,
                right: 1200,
                bottom: sectionTop + 800,
                width: 1200,
                height: 800,
                toJSON: () => ({})
            } as DOMRect
        })

        try {
            render(<UseSectionPagerScrollHarness />, {
                route: '/analysis/policy-branch-mega'
            })

            const scrollRoot = screen.getByTestId('scroll-root')
            const root = scrollRoot as HTMLElement
            root.scrollTop = 1500
            fireEvent.scroll(root)

            await waitFor(() => {
                expect(screen.getByTestId('current-index')).toHaveTextContent('1')
            })

            expect(screen.getByTestId('location-state')).toHaveTextContent('/analysis/policy-branch-mega')
        } finally {
            rectSpy.mockRestore()
        }
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
