import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import SlStrongDayStatsPage from './SlStrongDayStatsPage'

const { useBacktestSlStrongDayStatsReportQuery } = vi.hoisted(() => ({
    useBacktestSlStrongDayStatsReportQuery: vi.fn()
}))
const { useStatisticsSlStrongDayLiveReportQuery } = vi.hoisted(() => ({
    useStatisticsSlStrongDayLiveReportQuery: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/backtestSlStrongDayStats', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/backtestSlStrongDayStats')>()

    return {
        ...actual,
        useBacktestSlStrongDayStatsReportQuery
    }
})

vi.mock('@/shared/api/tanstackQueries/statisticsSlStrongDayLive', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/statisticsSlStrongDayLive')>()

    return {
        ...actual,
        useStatisticsSlStrongDayLiveReportQuery
    }
})

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

function createBacktestReport() {
    return {
        schemaVersion: 1,
        id: 'sl-strong-day-backtest-report',
        kind: 'backtest_sl_strong_day_stats',
        title: 'Backtest SL strong-day statistics',
        generatedAtUtc: '2026-04-03T11:00:00.000Z',
        sections: [
            {
                sectionKey: 'sl_strong_day_stats_config',
                title: 'Config',
                items: [
                    { itemKey: 'base_threshold_default', key: 'Base threshold', value: '3.00%' },
                    { itemKey: 'weak_cut_default', key: 'Weak cut', value: '2.40%' },
                    { itemKey: 'strong_cut_default', key: 'Strong cut', value: '3.60%' }
                ]
            },
            {
                sectionKey: 'owner_rule_summary',
                title: 'Summary',
                items: [
                    { itemKey: 'strong_days', key: 'Strong days', value: '29' },
                    { itemKey: 'gray_days', key: 'Gray days', value: '14' },
                    { itemKey: 'gray_down_regime_days', key: 'Gray down-regime days', value: '6' },
                    { itemKey: 'strong_sl_first_rate', key: 'Strong SL-first rate', value: '48.28%' },
                    { itemKey: 'weak_sl_first_rate', key: 'Weak SL-first rate', value: '22.90%' },
                    { itemKey: 'separation_strong_minus_weak', key: 'Separation', value: '+25.38 pp' }
                ]
            },
            {
                sectionKey: 'strong_day_sweep',
                title: 'Strong-day sweep',
                columns: ['BaseThreshold', 'StrongDays'],
                rows: [['3.00%', '29']]
            }
        ]
    }
}

function createLiveReport() {
    return {
        schemaVersion: 1,
        id: 'sl-strong-day-live-report',
        kind: 'statistics_sl_strong_day_live',
        title: 'Live SL strong-day statistics',
        generatedAtUtc: '2026-04-03T11:05:00.000Z',
        sections: [
            {
                sectionKey: 'live_sl_strong_day_scope',
                title: 'Scope',
                items: [
                    { itemKey: 'used_days', key: 'Used days', value: '9' },
                    { itemKey: 'finalized_with_fact_days', key: 'Finalized with fact days', value: '12' },
                    {
                        itemKey: 'missing_default_sl_path_outcome_days',
                        key: 'Missing default path outcome days',
                        value: '1'
                    },
                    { itemKey: 'non_strict_live_days', key: 'Non-strict live days', value: '2' }
                ]
            },
            {
                sectionKey: 'live_sl_strong_day_owner_summary',
                title: 'Live summary',
                items: [
                    { itemKey: 'strong_days', key: 'Strong days', value: '3' },
                    { itemKey: 'gray_days', key: 'Gray days', value: '2' },
                    { itemKey: 'gray_down_regime_days', key: 'Gray down-regime days', value: '1' },
                    { itemKey: 'strong_sl_first_rate', key: 'Strong SL-first rate', value: '66.67%' },
                    { itemKey: 'weak_sl_first_rate', key: 'Weak SL-first rate', value: '25.00%' },
                    { itemKey: 'separation_strong_minus_weak', key: 'Separation', value: '+41.67 pp' }
                ]
            },
            {
                sectionKey: 'live_strong_day_behavior',
                title: 'Live strong-day behavior',
                columns: ['Zone', 'Days'],
                rows: [['Strong', '3']]
            }
        ]
    }
}

describe('SlStrongDayStatsPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        vi.clearAllMocks()

        useBacktestSlStrongDayStatsReportQuery.mockReturnValue(
            createQueryResult({
                data: createBacktestReport()
            })
        )
        useStatisticsSlStrongDayLiveReportQuery.mockReturnValue(
            createQueryResult({
                data: createLiveReport()
            })
        )
    })

    test('renders summary cards, glossary, and both report panes', () => {
        render(<SlStrongDayStatsPage />)

        expect(screen.getByText('Статистика сильного дня')).toBeInTheDocument()
        expect(screen.getByText('Короткая сводка правила')).toBeInTheDocument()
        expect(screen.getByText('Рабочие пороги проекта')).toBeInTheDocument()
        expect(screen.getByText('Сводка на истории')).toBeInTheDocument()
        expect(screen.getByText('Сводка по реальным дням')).toBeInTheDocument()
        expect(screen.getByText('Покрытие реальных дней')).toBeInTheDocument()
        expect(screen.getByText('Термины таблиц')).toBeInTheDocument()
        expect(screen.getAllByText('3.00%').length).toBeGreaterThan(0)
        expect(screen.getAllByText('66.67%').length).toBeGreaterThan(0)
        expect(screen.getByText('Strong-day sweep')).toBeInTheDocument()
        expect(screen.getByText('Live strong-day behavior')).toBeInTheDocument()
    })

    test('keeps the page shell visible when both report queries fail', () => {
        useBacktestSlStrongDayStatsReportQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('history failed')
            })
        )
        useStatisticsSlStrongDayLiveReportQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('live failed')
            })
        )

        render(<SlStrongDayStatsPage />)

        expect(screen.getByText('Статистика сильного дня')).toBeInTheDocument()
        expect(screen.getByText('Не удалось загрузить статистику сильного дня на истории')).toBeInTheDocument()
        expect(screen.getByText('Не удалось загрузить статистику сильного дня по реальным дням')).toBeInTheDocument()
        expect(screen.queryByText('Strong-day sweep')).not.toBeInTheDocument()
    })
})
