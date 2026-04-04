import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ROUTE_PATH } from './consts'
import { ROUTE_CONFIG } from './routeConfig'
import { AppRoute } from './types'

function LocationProbe() {
    const location = useLocation()

    return <div data-testid='location'>{`${location.pathname}${location.search}${location.hash}`}</div>
}

function renderRedirectElement(routeId: AppRoute, initialEntry: string) {
    const route = ROUTE_CONFIG.find(candidate => candidate.id === routeId)
    if (!route) {
        throw new Error(`Route config is missing routeId=${routeId}.`)
    }

    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            {route.element}
            <LocationProbe />
        </MemoryRouter>
    )
}

describe('statistics legacy redirects', () => {
    test.each([
        {
            routeId: AppRoute.LEGACY_ANALYSIS_SHARP_MOVE_STATS,
            initialEntry: `${ROUTE_PATH[AppRoute.LEGACY_ANALYSIS_SHARP_MOVE_STATS]}?scope=oos#section-2`,
            expectedEntry: `${ROUTE_PATH[AppRoute.BACKTEST_SHARP_MOVE_STATS]}?scope=oos#section-2`
        },
        {
            routeId: AppRoute.LEGACY_ANALYSIS_BOUNDED_PARAMETER_STATS,
            initialEntry: `${ROUTE_PATH[AppRoute.LEGACY_ANALYSIS_BOUNDED_PARAMETER_STATS]}?owner=min_move#leaderboard`,
            expectedEntry: `${ROUTE_PATH[AppRoute.BACKTEST_BOUNDED_PARAMETER_STATS]}?owner=min_move#leaderboard`
        }
    ])('redirects $routeId to the canonical statistics route and keeps query/hash', async ({
        routeId,
        initialEntry,
        expectedEntry
    }) => {
        renderRedirectElement(routeId, initialEntry)

        await waitFor(() => {
            expect(screen.getByTestId('location')).toHaveTextContent(expectedEntry)
        })
    })
})
