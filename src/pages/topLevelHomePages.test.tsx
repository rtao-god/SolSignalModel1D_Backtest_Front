import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/app/providers/StoreProvider'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import GuidePage from './guidePages/ui/GuidePage'
import AnalysisPage from './analysisPages/ui/AnalysisPage'
import DiagnosticsPage from './diagnosticsPages/ui/DiagnosticsPage'
import StatisticsPage from './statisticsPages/ui/StatisticsPage'

function renderHomePage(screenNode: ReactElement, route: string) {
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

describe('Top-level home pages overview', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
    })

    test('renders guide overview block above topic cards', () => {
        const { container } = renderHomePage(<GuidePage />, ROUTE_PATH[AppRoute.GUIDE])

        expect(screen.getByText('Knowledge Base')).toBeInTheDocument()
        expect(screen.getByText('Quick entry into the knowledge base')).toBeInTheDocument()
        expect(screen.getByText('Which question leads to which topic')).toBeInTheDocument()
        expect(screen.getByText('Three normal reading routes')).toBeInTheDocument()
        expect(screen.getByText('How guide connects to neighboring sections')).toBeInTheDocument()
        expect(screen.getByText('7 topics')).toBeInTheDocument()
        expect(screen.getAllByRole('link', { name: 'Topic: Models' }).length).toBeGreaterThan(0)
        expect(container.textContent).not.toContain('[[')
    })

    test('renders analysis overview block above analysis cards', () => {
        const { container } = renderHomePage(<AnalysisPage />, ROUTE_PATH[AppRoute.ANALYSIS_HOME])

        expect(screen.getByText('Analysis')).toBeInTheDocument()
        expect(screen.getByText('How to read the analysis layer')).toBeInTheDocument()
        expect(screen.getByText('Which question opens which screen')).toBeInTheDocument()
        expect(screen.getByText('Normal order of reading analysis')).toBeInTheDocument()
        expect(screen.getByText('Which three layers are collected here')).toBeInTheDocument()
        expect(screen.getByText('8 pages')).toBeInTheDocument()
        expect(screen.getByText('Real Forecast Journal')).toBeInTheDocument()
        expect(screen.getAllByRole('link', { name: 'Section: Policy Branch Mega' }).length).toBeGreaterThan(0)
        expect(container.textContent).not.toContain('[[')
    })

    test('renders diagnostics overview block above diagnostics cards', () => {
        const { container } = renderHomePage(<DiagnosticsPage />, ROUTE_PATH[AppRoute.DIAGNOSTICS_HOME])

        expect(screen.getByText('Diagnostics')).toBeInTheDocument()
        expect(screen.getByText('How to read the diagnostics layer')).toBeInTheDocument()
        expect(screen.getByText('Which symptom opens which diagnostic screen')).toBeInTheDocument()
        expect(screen.getByText('Five normal steps of diagnostics')).toBeInTheDocument()
        expect(screen.getByText('Which kinds of causes live here')).toBeInTheDocument()
        expect(screen.getByText('5 pages')).toBeInTheDocument()
        expect(screen.getAllByRole('link', { name: 'Section: Risk and liquidations' }).length).toBeGreaterThan(0)
        expect(container.textContent).not.toContain('[[')
    })

    test('renders statistics overview block above statistics cards', () => {
        const { container } = renderHomePage(<StatisticsPage />, ROUTE_PATH[AppRoute.STATISTICS_HOME])

        expect(screen.getByText('Statistics')).toBeInTheDocument()
        expect(screen.getByText('How to read the statistics layer')).toBeInTheDocument()
        expect(screen.getByText('Which question opens which statistics screen')).toBeInTheDocument()
        expect(screen.getByText('Normal order of reading statistics')).toBeInTheDocument()
        expect(screen.getByText('Boundary between statistics and neighboring sections')).toBeInTheDocument()
        expect(screen.getByText('6 pages')).toBeInTheDocument()
        expect(screen.getByText('BTC weakness statistics')).toBeInTheDocument()
        expect(screen.getByText('Micro overlay statistics')).toBeInTheDocument()
        expect(screen.getByText('Trade risk statistics')).toBeInTheDocument()
        expect(screen.getByText('Strong-day statistics')).toBeInTheDocument()
        expect(screen.getAllByRole('link', { name: 'Section: BTC weakness statistics' }).length).toBeGreaterThan(0)
        expect(container.textContent).not.toContain('[[')
    })
})
