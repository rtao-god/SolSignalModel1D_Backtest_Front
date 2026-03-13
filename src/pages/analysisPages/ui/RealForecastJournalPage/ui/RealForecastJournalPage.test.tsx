import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import RealForecastJournalPage from './RealForecastJournalPage'
import { logError } from '@/shared/lib/logging/logError'

const {
    useRealForecastJournalDayListQuery,
    useRealForecastJournalDayQuery,
    useRealForecastJournalLiveStatusQuery,
    useRealForecastJournalOpsStatusQuery,
    useAggregationMetricsQuery,
    useBacktestConfidenceRiskReportQuery
} = vi.hoisted(() => ({
    useRealForecastJournalDayListQuery: vi.fn(),
    useRealForecastJournalDayQuery: vi.fn(),
    useRealForecastJournalLiveStatusQuery: vi.fn(),
    useRealForecastJournalOpsStatusQuery: vi.fn(),
    useAggregationMetricsQuery: vi.fn(),
    useBacktestConfidenceRiskReportQuery: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/realForecastJournal', () => ({
    useRealForecastJournalDayListQuery,
    useRealForecastJournalDayQuery,
    useRealForecastJournalLiveStatusQuery,
    useRealForecastJournalOpsStatusQuery
}))

vi.mock('@/shared/api/tanstackQueries/aggregation', () => ({
    useAggregationMetricsQuery
}))

vi.mock('@/shared/api/tanstackQueries/backtestConfidenceRisk', () => ({
    useBacktestConfidenceRiskReportQuery
}))

vi.mock('@/shared/lib/logging/logError', () => ({
    logError: vi.fn()
}))

function createQueryResult<T>(overrides: Record<string, unknown> = {}) {
    return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        ...overrides
    } as T
}

function clearLoggedSectionKeys() {
    const globalWithSectionKeys = globalThis as typeof globalThis & {
        __sectionDataStateLoggedKeys?: Set<string>
    }

    globalWithSectionKeys.__sectionDataStateLoggedKeys?.clear()
}

describe('RealForecastJournalPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
        clearLoggedSectionKeys()
        vi.clearAllMocks()

        useRealForecastJournalDayListQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('Failed to load real forecast journal index: 500'),
                refetch: vi.fn()
            })
        )
        useRealForecastJournalDayQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
        useRealForecastJournalLiveStatusQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
        useRealForecastJournalOpsStatusQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
        useAggregationMetricsQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
        useBacktestConfidenceRiskReportQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
    })

    test('keeps page shell visible when journal day list request fails', async () => {
        render(<RealForecastJournalPage />, {
            route: '/analysis/real-forecast-journal'
        })

        expect(screen.getByText('Real forecast journal and realized day outcome')).toBeInTheDocument()
        expect(screen.getByText('Upcoming journal updates')).toBeInTheDocument()
        expect(screen.getByText('Captured trading days')).toBeInTheDocument()
        expect(screen.getByText('Failed to load the real forecast journal')).toBeInTheDocument()
        expect(screen.getByText('Live sample vs historical benchmark')).toBeInTheDocument()

        await waitFor(() => {
            expect(vi.mocked(logError)).toHaveBeenCalledWith(
                expect.any(Error),
                undefined,
                expect.objectContaining({ source: 'real-forecast-journal-day-list' })
            )
        })
    })
})
