import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import SlOverlayStatsPage from './SlOverlayStatsPage'

const { useBacktestSlOverlayStatsReportQuery } = vi.hoisted(() => ({
    useBacktestSlOverlayStatsReportQuery: vi.fn()
}))
const { useStatisticsSlOverlayLiveReportQuery } = vi.hoisted(() => ({
    useStatisticsSlOverlayLiveReportQuery: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/backtestSlOverlayStats', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/backtestSlOverlayStats')>()

    return {
        ...actual,
        useBacktestSlOverlayStatsReportQuery
    }
})

vi.mock('@/shared/api/tanstackQueries/statisticsSlOverlayLive', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/statisticsSlOverlayLive')>()

    return {
        ...actual,
        useStatisticsSlOverlayLiveReportQuery
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
        id: 'sl-overlay-backtest-report',
        kind: 'backtest_sl_overlay_stats',
        title: 'Backtest SL overlay statistics',
        generatedAtUtc: '2026-04-03T10:00:00.000Z',
        sections: [
            {
                sectionKey: 'sl_overlay_stats_config',
                title: 'Config',
                items: [
                    { itemKey: 'min_confidence_default', key: 'Min confidence', value: '0.55' },
                    { itemKey: 'strong_confidence_default', key: 'Strong confidence', value: '0.70' },
                    { itemKey: 'max_impact_default', key: 'Max impact', value: '30.00%' },
                    { itemKey: 'gamma_sl_default', key: 'Gamma sl', value: '1.00' },
                    { itemKey: 'min_top_class_default', key: 'Min top class', value: '34.00%' },
                    { itemKey: 'max_top_class_default', key: 'Max top class', value: '90.00%' },
                    { itemKey: 'default_path_profile', key: 'Default path profile', value: 'baseline-default' }
                ]
            },
            {
                sectionKey: 'owner_rule_summary',
                title: 'Summary',
                items: [
                    { itemKey: 'high_risk_days', key: 'High-risk days', value: '31' },
                    { itemKey: 'high_risk_rate', key: 'High-risk rate', value: '18.20%' },
                    { itemKey: 'sl_first_precision_high_risk', key: 'SL-first precision', value: '58.33%' },
                    { itemKey: 'binary_accuracy_total', key: 'Binary accuracy', value: '60.20%' },
                    { itemKey: 'clamp_min_days', key: 'Clamp min days', value: '7' },
                    { itemKey: 'clamp_max_days', key: 'Clamp max days', value: '12' }
                ]
            },
            {
                sectionKey: 'impact_sweep',
                title: 'Impact sweep',
                columns: ['MaxImpact', 'HighRiskDays'],
                rows: [['30.00%', '31']]
            }
        ]
    }
}

function createLiveReport() {
    return {
        schemaVersion: 1,
        id: 'sl-overlay-live-report',
        kind: 'statistics_sl_overlay_live',
        title: 'Live SL overlay statistics',
        generatedAtUtc: '2026-04-03T10:05:00.000Z',
        sections: [
            {
                sectionKey: 'live_sl_overlay_scope',
                title: 'Scope',
                items: [
                    { itemKey: 'used_days', key: 'Used days', value: '9' },
                    { itemKey: 'finalized_with_fact_days', key: 'Finalized with fact days', value: '11' },
                    {
                        itemKey: 'missing_default_sl_path_outcome_days',
                        key: 'Missing default path outcome days',
                        value: '1'
                    },
                    { itemKey: 'non_strict_live_days', key: 'Non-strict live days', value: '2' }
                ]
            },
            {
                sectionKey: 'live_sl_overlay_owner_summary',
                title: 'Live summary',
                items: [
                    { itemKey: 'high_risk_days', key: 'High-risk days', value: '4' },
                    { itemKey: 'high_risk_rate', key: 'High-risk rate', value: '36.36%' },
                    { itemKey: 'sl_first_precision_high_risk', key: 'SL-first precision', value: '75.00%' },
                    { itemKey: 'binary_accuracy_total', key: 'Binary accuracy', value: '63.64%' },
                    { itemKey: 'clamp_min_days', key: 'Clamp min days', value: '1' },
                    { itemKey: 'clamp_max_days', key: 'Clamp max days', value: '2' }
                ]
            },
            {
                sectionKey: 'clamp_behavior',
                title: 'Clamp behavior',
                columns: ['Clamp', 'Days'],
                rows: [['34-90%', '3']]
            }
        ]
    }
}

describe('SlOverlayStatsPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        vi.clearAllMocks()

        useBacktestSlOverlayStatsReportQuery.mockReturnValue(
            createQueryResult({
                data: createBacktestReport()
            })
        )
        useStatisticsSlOverlayLiveReportQuery.mockReturnValue(
            createQueryResult({
                data: createLiveReport()
            })
        )
    })

    test('renders summary cards, glossary, and both report panes', () => {
        render(<SlOverlayStatsPage />)

        expect(screen.getByText('Статистика риска сделки')).toBeInTheDocument()
        expect(screen.getByText('Короткая сводка правила')).toBeInTheDocument()
        expect(screen.getByText('Рабочие пороги проекта')).toBeInTheDocument()
        expect(screen.getByText('Сводка на истории')).toBeInTheDocument()
        expect(screen.getByText('Сводка по реальным дням')).toBeInTheDocument()
        expect(screen.getByText('Покрытие реальных дней')).toBeInTheDocument()
        expect(screen.getByText('Термины таблиц')).toBeInTheDocument()
        expect(screen.getAllByText('0.55').length).toBeGreaterThan(0)
        expect(screen.getAllByText('75.00%').length).toBeGreaterThan(0)
        expect(screen.getByText('Impact sweep')).toBeInTheDocument()
        expect(screen.getByText('Clamp behavior')).toBeInTheDocument()
    })

    test('keeps the page shell visible when both report queries fail', () => {
        useBacktestSlOverlayStatsReportQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('history failed')
            })
        )
        useStatisticsSlOverlayLiveReportQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('live failed')
            })
        )

        render(<SlOverlayStatsPage />)

        expect(screen.getByText('Статистика риска сделки')).toBeInTheDocument()
        expect(screen.getByText('Не удалось загрузить статистику риска сделки на истории')).toBeInTheDocument()
        expect(screen.getByText('Не удалось загрузить статистику риска сделки по реальным дням')).toBeInTheDocument()
        expect(screen.queryByText('Impact sweep')).not.toBeInTheDocument()
    })
})
