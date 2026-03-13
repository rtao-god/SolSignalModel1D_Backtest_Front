import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@/shared/lib/tests/ComponentRender/ComponentRender'

const HOVER_OPEN_DELAY_MS = 170
const HOVER_HIDE_DELAY_MS = 120
let TermTooltipComponent: typeof import('./TermTooltip').default

function NestedTooltipFixture() {
    const TermTooltip = TermTooltipComponent

    return (
        <div>
            <TermTooltip
                term='Root'
                description={
                    <div>
                        <span>Root body. </span>
                        <TermTooltip
                            term='Inner'
                            description={
                                <div>
                                    <span>Inner body. </span>
                                    <TermTooltip term='Deep' description='Deep body.' />
                                </div>
                            }
                        />
                    </div>
                }
            />
        </div>
    )
}

function getTooltipTrigger(term: string): HTMLElement {
    return screen.getByRole('button', { name: `Что такое ${term}?` })
}

function getTooltipOverlay(title: string): HTMLElement {
    const overlay = screen.getAllByRole('tooltip').find(item => {
        return within(item).queryByText(title, { selector: 'p' }) !== null
    })

    if (!overlay) {
        throw new Error(`Tooltip overlay with title "${title}" was not found.`)
    }

    return overlay
}

function queryTooltipOverlay(title: string): HTMLElement | null {
    return (
        screen.queryAllByRole('tooltip').find(item => within(item).queryByText(title, { selector: 'p' }) !== null) ??
        null
    )
}

function waitForTooltipOverlay(title: string): HTMLElement {
    for (let step = 0; step < 20; step += 1) {
        const overlay = queryTooltipOverlay(title)
        if (overlay) {
            return overlay
        }

        act(() => {
            vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS)
        })
    }

    throw new Error(`Tooltip overlay with title "${title}" did not open in expected time.`)
}

function advanceHideDelay(): void {
    act(() => {
        vi.advanceTimersByTime(HOVER_HIDE_DELAY_MS)
    })
}

describe('TermTooltip nested hover tree', () => {
    beforeEach(async () => {
        vi.useFakeTimers()
        vi.resetModules()
        TermTooltipComponent = (await import('./TermTooltip')).default
    })

    afterEach(() => {
        vi.runOnlyPendingTimers()
        vi.useRealTimers()
    })

    test('keeps nested tooltip open while pointer stays inside root tooltip tree', () => {
        render(<NestedTooltipFixture />)

        const rootTrigger = getTooltipTrigger('Root')
        fireEvent.mouseEnter(rootTrigger)

        const rootOverlay = waitForTooltipOverlay('Root')
        fireEvent.mouseEnter(rootOverlay)
        fireEvent.mouseLeave(rootTrigger, { relatedTarget: rootOverlay })

        const innerTrigger = getTooltipTrigger('Inner')
        fireEvent.mouseEnter(innerTrigger)

        expect(waitForTooltipOverlay('Inner')).toBeInTheDocument()

        fireEvent.mouseLeave(innerTrigger, { relatedTarget: rootOverlay })
        advanceHideDelay()

        expect(getTooltipOverlay('Inner')).toBeInTheDocument()
    })

    test('closes nested tooltip after timeout when pointer leaves the whole tree', () => {
        render(<NestedTooltipFixture />)

        const rootTrigger = getTooltipTrigger('Root')
        fireEvent.mouseEnter(rootTrigger)

        const rootOverlay = waitForTooltipOverlay('Root')
        fireEvent.mouseEnter(rootOverlay)
        fireEvent.mouseLeave(rootTrigger, { relatedTarget: rootOverlay })

        const innerTrigger = getTooltipTrigger('Inner')
        fireEvent.mouseEnter(innerTrigger)
        waitForTooltipOverlay('Inner')
        expect(getTooltipOverlay('Inner')).toBeInTheDocument()

        fireEvent.mouseLeave(innerTrigger, { relatedTarget: rootOverlay })
        fireEvent.mouseLeave(rootOverlay, { relatedTarget: document.body })
        advanceHideDelay()

        expect(queryTooltipOverlay('Inner')).toBeNull()
    })

    test('cancels nested close when pointer returns before hide timeout', () => {
        render(<NestedTooltipFixture />)

        const rootTrigger = getTooltipTrigger('Root')
        fireEvent.mouseEnter(rootTrigger)

        const rootOverlay = waitForTooltipOverlay('Root')
        fireEvent.mouseEnter(rootOverlay)
        fireEvent.mouseLeave(rootTrigger, { relatedTarget: rootOverlay })

        const innerTrigger = getTooltipTrigger('Inner')
        fireEvent.mouseEnter(innerTrigger)
        waitForTooltipOverlay('Inner')
        expect(getTooltipOverlay('Inner')).toBeInTheDocument()

        fireEvent.mouseLeave(innerTrigger, { relatedTarget: rootOverlay })
        fireEvent.mouseLeave(rootOverlay, { relatedTarget: document.body })

        act(() => {
            vi.advanceTimersByTime(HOVER_HIDE_DELAY_MS - 40)
        })

        fireEvent.mouseEnter(rootOverlay)
        advanceHideDelay()

        expect(getTooltipOverlay('Inner')).toBeInTheDocument()
    })

    test('opens deeper nested tooltip without pinning intermediate node', () => {
        render(<NestedTooltipFixture />)

        const rootTrigger = getTooltipTrigger('Root')
        fireEvent.mouseEnter(rootTrigger)

        const rootOverlay = waitForTooltipOverlay('Root')
        fireEvent.mouseEnter(rootOverlay)
        fireEvent.mouseLeave(rootTrigger, { relatedTarget: rootOverlay })

        const innerTrigger = getTooltipTrigger('Inner')
        fireEvent.mouseEnter(innerTrigger)
        const innerOverlay = waitForTooltipOverlay('Inner')

        fireEvent.mouseEnter(innerOverlay)
        fireEvent.mouseLeave(innerTrigger, { relatedTarget: innerOverlay })

        const deepTrigger = getTooltipTrigger('Deep')
        fireEvent.mouseEnter(deepTrigger)

        expect(waitForTooltipOverlay('Deep')).toBeInTheDocument()
    })

    test('keeps pinned nested tooltip open independently from hover timeout', () => {
        render(<NestedTooltipFixture />)

        const rootTrigger = getTooltipTrigger('Root')
        fireEvent.mouseEnter(rootTrigger)

        const rootOverlay = waitForTooltipOverlay('Root')
        fireEvent.mouseEnter(rootOverlay)
        fireEvent.mouseLeave(rootTrigger, { relatedTarget: rootOverlay })

        const innerTrigger = getTooltipTrigger('Inner')
        fireEvent.mouseEnter(innerTrigger)
        waitForTooltipOverlay('Inner')
        expect(getTooltipOverlay('Inner')).toBeInTheDocument()

        fireEvent.click(innerTrigger)
        fireEvent.mouseLeave(innerTrigger, { relatedTarget: rootOverlay })
        fireEvent.mouseLeave(rootOverlay, { relatedTarget: document.body })
        advanceHideDelay()

        expect(getTooltipOverlay('Inner')).toBeInTheDocument()
    })

    test('renders nested tooltip terms inside function-based root descriptions', () => {
        render(
            <div>
                <TermTooltipComponent
                    term='Root'
                    description={() =>
                        'Итог строится из [[current-prediction-daily-layer|Daily]] и [[landing-micro-model|Micro]].'
                    }
                />
            </div>
        )

        fireEvent.click(getTooltipTrigger('Root'))

        expect(screen.getByRole('button', { name: 'Что такое Daily?' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Что такое Micro?' })).toBeInTheDocument()
    })
})
