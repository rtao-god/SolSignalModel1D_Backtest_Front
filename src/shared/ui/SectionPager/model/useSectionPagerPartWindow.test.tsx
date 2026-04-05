import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { vi } from 'vitest'
import { useSectionPagerPartWindow } from './useSectionPagerPartWindow'

const scrollToAnchorMock = vi.fn()

vi.mock('../lib/scrollToAnchor', () => ({
    scrollToAnchor: (...args: unknown[]) => scrollToAnchorMock(...args)
}))

function resolvePartFromAnchor(anchor: string): number | null {
    const match = anchor.match(/part-(\d+)/)
    if (!match?.[1]) {
        return null
    }

    return Number(match[1])
}

function UseSectionPagerPartWindowHarness() {
    const { requestedParts, windowCenterPart, currentIndex } = useSectionPagerPartWindow({
        sections: [
            { id: 'part-1-terms', anchor: 'part-1-terms' },
            { id: 'part-1-table', anchor: 'part-1-table' },
            { id: 'part-2-terms', anchor: 'part-2-terms' },
            { id: 'part-2-table', anchor: 'part-2-table' },
            { id: 'part-3-terms', anchor: 'part-3-terms' },
            { id: 'part-3-table', anchor: 'part-3-table' }
        ],
        activeAnchor: 'part-1-terms',
        activePart: 1,
        availableParts: [1, 2, 3, 4],
        resolvePartFromAnchor,
        syncHash: false,
        trackScroll: true,
        resetKey: 'daily|aggregate|real|all|with-sl|with-zonal'
    })

    return (
        <div className='app' data-testid='scroll-root'>
            <div data-testid='requested-parts'>{requestedParts.join(',')}</div>
            <div data-testid='window-center'>{windowCenterPart}</div>
            <div data-testid='current-index'>{currentIndex}</div>
            <div id='part-1-terms' style={{ height: 600 }} />
            <div id='part-1-table' style={{ height: 600 }} />
            <div id='part-2-terms' style={{ height: 600 }} />
            <div id='part-2-table' style={{ height: 600 }} />
            <div id='part-3-terms' style={{ height: 600 }} />
            <div id='part-3-table' style={{ height: 600 }} />
        </div>
    )
}

describe('useSectionPagerPartWindow', () => {
    test('держит соседнюю часть в pending окне и расширяет окно после scroll на part 2', async () => {
        const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
            this: HTMLElement
        ) {
            const scrollRoot = document.querySelector('.app') as HTMLElement | null
            const scrollTop = scrollRoot?.scrollTop ?? 0

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

            const order = [
                'part-1-terms',
                'part-1-table',
                'part-2-terms',
                'part-2-table',
                'part-3-terms',
                'part-3-table'
            ].indexOf(this.id)
            const sectionBaseTop = order * 700
            const sectionTop = sectionBaseTop - scrollTop

            return {
                x: 0,
                y: sectionTop,
                top: sectionTop,
                left: 0,
                right: 1200,
                bottom: sectionTop + 600,
                width: 1200,
                height: 600,
                toJSON: () => ({})
            } as DOMRect
        })

        try {
            render(<UseSectionPagerPartWindowHarness />, {
                route: '/analysis/policy-branch-mega'
            })

            expect(screen.getByTestId('requested-parts')).toHaveTextContent('1,2')
            expect(screen.getByTestId('window-center')).toHaveTextContent('1')

            const scrollRoot = screen.getByTestId('scroll-root') as HTMLElement
            scrollRoot.scrollTop = 1450
            fireEvent.scroll(scrollRoot)

            await waitFor(() => {
                expect(screen.getByTestId('window-center')).toHaveTextContent('2')
            })

            expect(screen.getByTestId('current-index')).toHaveTextContent('2')
            expect(screen.getByTestId('requested-parts')).toHaveTextContent('1,2,3')
        } finally {
            rectSpy.mockRestore()
        }
    })
})
