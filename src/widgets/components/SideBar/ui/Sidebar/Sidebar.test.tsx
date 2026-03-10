import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/app/providers/StoreProvider'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import cls from './Sidebar.module.scss'
import Sidebar from './Sidebar'

function renderSidebar(route: string) {
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
                    <I18nextProvider i18n={i18nForTests}>
                        <Sidebar />
                    </I18nextProvider>
                </MemoryRouter>
            </StoreProvider>
        </QueryClientProvider>
    )
}

describe('Sidebar route matching', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
    })

    test('keeps only prediction history active on history route', () => {
        renderSidebar(ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY])

        const currentPredictionLink = screen.getByRole('link', { name: 'Current prediction' })
        const predictionHistoryLink = screen.getByRole('link', { name: 'Prediction history' })

        expect(predictionHistoryLink).toHaveClass(cls.linkActive)
        expect(currentPredictionLink).not.toHaveClass(cls.linkActive)
    })

    test('keeps current prediction active on base route', () => {
        renderSidebar(ROUTE_PATH[AppRoute.CURRENT_PREDICTION])

        const currentPredictionLink = screen.getByRole('link', { name: 'Current prediction' })
        const predictionHistoryLink = screen.getByRole('link', { name: 'Prediction history' })

        expect(currentPredictionLink).toHaveClass(cls.linkActive)
        expect(predictionHistoryLink).not.toHaveClass(cls.linkActive)
    })

    test.each([
        {
            route: `${ROUTE_PATH[AppRoute.DEVELOPER_BACKEND_STRUCTURE]}#developer-structure-root-source`,
            activeTabLabel: 'Root source and exclusions'
        },
        {
            route: `${ROUTE_PATH[AppRoute.DEVELOPER_RUNTIME_FLOW]}#developer-runtime-bootstrap`,
            activeTabLabel: 'Bootstrap'
        },
        {
            route: `${ROUTE_PATH[AppRoute.DEVELOPER_REPORTS_API]}#developer-delivery-api`,
            activeTabLabel: 'API surface'
        },
        {
            route: `${ROUTE_PATH[AppRoute.DEVELOPER_TESTS_GUARDS]}#developer-guards-selfcheck`,
            activeTabLabel: 'Self-check'
        }
    ])('shows only developer sidebar section on $route', ({ route, activeTabLabel }) => {
        renderSidebar(route)

        expect(screen.getByText('For developers')).toBeInTheDocument()
        expect(screen.queryByText('Predictions')).not.toBeInTheDocument()
        expect(screen.getByRole('link', { name: activeTabLabel })).toHaveClass(cls.subLinkActive)
    })
})
