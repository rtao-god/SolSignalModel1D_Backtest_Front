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
import DeveloperPage from './index'
import DeveloperBackendStructurePage from './DeveloperBackendStructurePage'
import DeveloperRuntimeFlowPage from './DeveloperRuntimeFlowPage'
import DeveloperReportsApiPage from './DeveloperReportsApiPage'
import DeveloperTestsGuardsPage from './DeveloperTestsGuardsPage'

function renderDeveloperScreen(screenNode: ReactElement, route: string) {
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

describe('Developer pages smoke', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
    })

    test('renders developer home cards', () => {
        renderDeveloperScreen(<DeveloperPage />, ROUTE_PATH[AppRoute.DEVELOPER])

        expect(screen.getByText('For the backend developer')).toBeInTheDocument()
        expect(screen.getByText('Project snapshot')).toBeInTheDocument()
        expect(screen.getByText('Snapshot passport')).toBeInTheDocument()
        expect(screen.getAllByText('SOL/USDT').length).toBeGreaterThan(0)
        expect(screen.getByText('How causal and omniscient stay separated')).toBeInTheDocument()
        expect(screen.getByText('How the test contour is built')).toBeInTheDocument()
        expect(screen.getByText('About 578 tests')).toBeInTheDocument()
        expect(screen.getByText('SolSignalModel1D_Backtest.Tests')).toBeInTheDocument()
        expect(screen.getAllByRole('link', { name: 'Open the tests and guards page' }).length).toBeGreaterThan(0)
        expect(screen.getAllByRole('link', { name: 'Open the structure page' }).length).toBeGreaterThan(0)
        expect(screen.getByText('Backend structure')).toBeInTheDocument()
        expect(screen.getAllByText('Execution flow').length).toBeGreaterThan(0)
        expect(screen.getByText('Reports and API')).toBeInTheDocument()
        expect(screen.getAllByText('Tests and guard layers').length).toBeGreaterThan(0)
    })

    test.each([
        {
            route: ROUTE_PATH[AppRoute.DEVELOPER_BACKEND_STRUCTURE],
            component: <DeveloperBackendStructurePage />,
            sectionTitle: 'How to read the map'
        },
        {
            route: ROUTE_PATH[AppRoute.DEVELOPER_RUNTIME_FLOW],
            component: <DeveloperRuntimeFlowPage />,
            sectionTitle: 'Entry points'
        },
        {
            route: ROUTE_PATH[AppRoute.DEVELOPER_REPORTS_API],
            component: <DeveloperReportsApiPage />,
            sectionTitle: 'Report builders'
        },
        {
            route: ROUTE_PATH[AppRoute.DEVELOPER_TESTS_GUARDS],
            component: <DeveloperTestsGuardsPage />,
            sectionTitle: 'Test suites'
        }
    ])(
        'renders $route content and inline why links',
        ({ route, component, sectionTitle }) => {
            renderDeveloperScreen(component, route)

            expect(screen.getByText(sectionTitle)).toBeInTheDocument()
            expect(screen.getAllByText('Why?').length).toBeGreaterThan(0)
        }
    )

    test('renders detailed backend structure map without old template wording', () => {
        renderDeveloperScreen(<DeveloperBackendStructurePage />, ROUTE_PATH[AppRoute.DEVELOPER_BACKEND_STRUCTURE])

        expect(screen.getByText('Root, solutions, and dependency ladder')).toBeInTheDocument()
        expect(screen.getByText('Core foundation and contracts')).toBeInTheDocument()
        expect(screen.getByText('Model pipeline projects')).toBeInTheDocument()
        expect(screen.getByText('Runtime / reports / API')).toBeInTheDocument()
        expect(screen.getByText('Guards and quality projects')).toBeInTheDocument()
        expect(screen.getByText('Root source folders and exclusions')).toBeInTheDocument()
        expect(screen.getByText('Projects from the main SolSignalModel1D_Backtest.sln')).toBeInTheDocument()
        expect(screen.getByText('Canonical solution and Api.sln')).toBeInTheDocument()
        expect(screen.getByText('Foundation: time, base types, and contracts')).toBeInTheDocument()
        expect(screen.getByText('Model pipeline: causal, infer, train, omniscient')).toBeInTheDocument()
        expect(screen.getByText('Runtime: orchestration, reports, API')).toBeInTheDocument()
        expect(screen.getByText('Quality: tests, arch tests, analyzers')).toBeInTheDocument()
        expect(screen.getByText('Where the executable backend starts')).toBeInTheDocument()
        expect(screen.getByText('Which root files to read first')).toBeInTheDocument()
        expect(screen.getByText('How to use the dependency ladder')).toBeInTheDocument()
        expect(screen.getByText('Project')).toBeInTheDocument()
        expect(screen.getAllByText('Zone').length).toBeGreaterThan(0)
        expect(screen.getAllByText('What lives here').length).toBeGreaterThan(0)
        expect(screen.getAllByText('When to open it').length).toBeGreaterThan(0)

        expect(screen.getAllByText('SolSignalModel1D_Backtest').length).toBeGreaterThan(0)
        expect(screen.getAllByText('SolSignalModel1D_Backtest.Core.Config').length).toBeGreaterThan(0)
        expect(screen.getAllByText('SolSignalModel1D_Backtest.Reports.Runner').length).toBeGreaterThan(0)
        expect(screen.getAllByText('SolSignalModel1D_Backtest.ArchTests').length).toBeGreaterThan(0)
        expect(screen.getAllByText('SolSignalModel1D_Backtest.Analyzers.Tests').length).toBeGreaterThan(0)
        expect(screen.getAllByText('SolSignalModel1D_Backtest.CachePath.Analyzers.Tests').length).toBeGreaterThan(0)
        expect(
            screen.getByText('SolSignalModel1D_Backtest.Core.Causal.Trusted (inactive snapshot folder)')
        ).toBeInTheDocument()
        expect(screen.queryByText(/^SolSignalModel1D_Backtest\.Core\.Causal\.Trusted$/)).not.toBeInTheDocument()
        expect(screen.queryByText(/owner of a responsibility/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/This keeps the main tree from being polluted/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/It shows not just directory names/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/useful to know about/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/If a change touches/i)).not.toBeInTheDocument()
        expect(screen.getAllByText('Why?').length).toBeGreaterThan(0)

        const rootProjectButton = screen.getByRole('button', { name: 'SolSignalModel1D_Backtest' })
        const coreTimeButton = screen.getByRole('button', { name: 'SolSignalModel1D_Backtest.Core.Time' })

        fireEvent.click(coreTimeButton)

        expect(coreTimeButton).toHaveAttribute('aria-pressed', 'true')
        expect(rootProjectButton).toHaveAttribute('aria-pressed', 'false')

        const detailRegion = screen.getByRole('region', { name: 'Selected project details' })

        expect(within(detailRegion).getByText('SolSignalModel1D_Backtest.Core.Time')).toBeInTheDocument()
        expect(within(detailRegion).getByText('Foundation')).toBeInTheDocument()
        expect(within(detailRegion).getByText('Subfolders and zones inside the project')).toBeInTheDocument()
        expect(within(detailRegion).getByText('Adapters')).toBeInTheDocument()
        expect(within(detailRegion).getAllByRole('button', { name: 'Что такое NY windowing?' }).length).toBeGreaterThan(
            0
        )
        expect(within(detailRegion).getByText(/defines the temporal canon of the backend/i)).toBeInTheDocument()
    }, 45000)
})
