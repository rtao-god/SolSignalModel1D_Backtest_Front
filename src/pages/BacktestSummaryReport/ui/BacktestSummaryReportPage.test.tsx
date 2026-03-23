import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import BacktestSummaryReportPage from './BacktestSummaryReportPage'
import { logError } from '@/shared/lib/logging/logError'

const { useBacktestBaselineSummaryReportQuery } = vi.hoisted(() => ({
    useBacktestBaselineSummaryReportQuery: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/backtest', () => ({
    useBacktestBaselineSummaryReportQuery
}))

vi.mock('@/shared/lib/logging/logError', () => ({
    logError: vi.fn()
}))

function clearLoggedSectionKeys() {
    const globalWithSectionKeys = globalThis as typeof globalThis & {
        __sectionDataStateLoggedKeys?: Set<string>
    }

    globalWithSectionKeys.__sectionDataStateLoggedKeys?.clear()
}

describe('BacktestSummaryReportPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
        clearLoggedSectionKeys()
        vi.clearAllMocks()

        useBacktestBaselineSummaryReportQuery.mockReturnValue({
            data: null,
            isLoading: false,
            isError: true,
            error: new Error('Failed to load backtest summary report: 500'),
            refetch: vi.fn()
        })
    })

    test('keeps static page title visible when summary report request fails', async () => {
        render(<BacktestSummaryReportPage />, {
            route: '/backtest/summary'
        })

        expect(screen.getByText('Backtest summary')).toBeInTheDocument()
        expect(screen.getByText('Failed to load backtest summary')).toBeInTheDocument()

        await waitFor(() => {
            expect(vi.mocked(logError)).toHaveBeenCalledWith(
                expect.any(Error),
                undefined,
                expect.objectContaining({ source: 'backtest-summary-report' })
            )
        })
    })
})
