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

vi.mock('@/shared/lib/logging/logError', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/lib/logging/logError')>()

    return {
        ...actual,
        logError: vi.fn()
    }
})

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

    test('hides duplicate margin mode column when policy name already contains Cross or Isolated', async () => {
        useBacktestBaselineSummaryReportQuery.mockReturnValue({
            data: {
                schemaVersion: 1,
                id: 'backtest-summary-test',
                kind: 'backtest_summary',
                title: 'Backtest summary',
                generatedAtUtc: '2026-03-30T12:00:00.000Z',
                sections: [
                    {
                        sectionKey: 'summary_parameters',
                        title: 'Backtest summary parameters',
                        items: [{ itemKey: 'signal_days', key: 'SignalDays', value: '42' }]
                    },
                    {
                        sectionKey: 'baseline_policies',
                        title: 'Policies (baseline config)',
                        columns: ['Name', 'Type', 'MarginMode'],
                        columnKeys: ['policy_name', 'policy_type', 'margin_mode'],
                        rows: [['risk_aware Cross', 'FixedPolicy', 'Cross']]
                    }
                ]
            },
            isLoading: false,
            isError: false,
            error: null,
            refetch: vi.fn()
        })

        render(<BacktestSummaryReportPage />, {
            route: '/backtest/summary'
        })

        expect(screen.getByText('risk_aware Cross')).toBeInTheDocument()
        expect(screen.queryByRole('columnheader', { name: /margin mode/i })).not.toBeInTheDocument()
        expect(screen.queryByText('MarginMode')).not.toBeInTheDocument()
        expect(screen.queryByText('Margin mode')).not.toBeInTheDocument()
    })

    test('does not show the removed published-message line in the status card', async () => {
        useBacktestBaselineSummaryReportQuery.mockReturnValue({
            data: {
                schemaVersion: 1,
                id: 'backtest-summary-test',
                kind: 'backtest_summary',
                title: 'Backtest summary',
                generatedAtUtc: '2026-03-30T12:00:00.000Z',
                sections: [
                    {
                        sectionKey: 'summary_parameters',
                        title: 'Backtest summary parameters',
                        items: [{ itemKey: 'signal_days', key: 'SignalDays', value: '42' }]
                    }
                ]
            },
            isLoading: false,
            isError: false,
            error: null,
            refetch: vi.fn()
        })

        render(<BacktestSummaryReportPage />, {
            route: '/backtest/summary'
        })

        expect(screen.getByText('ACTUAL: published backtest summary')).toBeInTheDocument()
        expect(
            screen.queryByText('This page reads the published report directly and does not re-check freshness while opening.')
        ).not.toBeInTheDocument()
    })
})
