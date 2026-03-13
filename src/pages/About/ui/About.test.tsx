import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/app/providers/StoreProvider'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import About from './About'

function renderAboutScreen(screenNode: ReactElement, route: string) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    })

    return render(
        <QueryClientProvider client={queryClient}>
            <StoreProvider>
                <MemoryRouter initialEntries={[route]}>
                    <I18nextProvider i18n={i18nForTests}>{screenNode}</I18nextProvider>
                </MemoryRouter>
            </StoreProvider>
        </QueryClientProvider>
    )
}

describe('/about navigation atlas', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
    })

    test('renders dark atlas structure without block counters', () => {
        renderAboutScreen(<About />, ROUTE_PATH[AppRoute.ABOUT])

        expect(screen.getByText('All visible navigation in one page')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Main' })).toHaveAttribute('href', '/')
        expect(screen.getAllByText('Predictions').length).toBeGreaterThan(0)
        expect(screen.queryByText(/Blocks:/i)).not.toBeInTheDocument()
    })

    test('expands main -> predictions -> prediction history into page blocks', () => {
        renderAboutScreen(<About />, ROUTE_PATH[AppRoute.ABOUT])

        const mainToggle = screen.getByRole('button', { name: 'Show details for Main' })
        fireEvent.click(mainToggle)

        const mainRegion = screen.getByRole('region', { name: 'Details for Main' })
        const predictionsToggle = within(mainRegion).getByRole('button', { name: 'Show details for Predictions' })
        fireEvent.click(predictionsToggle)

        const predictionsRegion = within(mainRegion).getByRole('region', { name: 'Details for Predictions' })
        expect(within(predictionsRegion).getByRole('link', { name: 'Current prediction' })).toHaveAttribute(
            'href',
            ROUTE_PATH[AppRoute.CURRENT_PREDICTION]
        )

        const historyToggle = within(predictionsRegion).getByRole('button', {
            name: 'Show details for Prediction history'
        })
        fireEvent.click(historyToggle)

        const historyRegion = within(predictionsRegion).getByRole('region', {
            name: 'Details for Prediction history'
        })
        expect(within(historyRegion).getByRole('link', { name: /^Filters and history window\b/ })).toHaveAttribute(
            'href',
            ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY]
        )
        expect(within(historyRegion).getByRole('link', { name: /^Policy trades\b/ })).toHaveAttribute(
            'href',
            ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY]
        )
    })

    test('renders factor tooltip inside about rich text copy', () => {
        renderAboutScreen(<About />, ROUTE_PATH[AppRoute.ABOUT])

        expect(screen.getByRole('button', { name: 'What is factors?' })).toBeInTheDocument()
    })
})
