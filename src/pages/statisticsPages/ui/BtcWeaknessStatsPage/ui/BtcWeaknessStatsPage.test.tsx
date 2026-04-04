import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import BtcWeaknessStatsPage from './BtcWeaknessStatsPage'

const { useBacktestBtcWeaknessStatsReportQuery } = vi.hoisted(() => ({
    useBacktestBtcWeaknessStatsReportQuery: vi.fn()
}))
const { useStatisticsBtcWeaknessLiveReportQuery } = vi.hoisted(() => ({
    useStatisticsBtcWeaknessLiveReportQuery: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/backtestBtcWeaknessStats', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/backtestBtcWeaknessStats')>()

    return {
        ...actual,
        useBacktestBtcWeaknessStatsReportQuery
    }
})

vi.mock('@/shared/api/tanstackQueries/statisticsBtcWeaknessLive', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/statisticsBtcWeaknessLive')>()

    return {
        ...actual,
        useStatisticsBtcWeaknessLiveReportQuery
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
        id: 'btc-weakness-backtest-report',
        kind: 'backtest_btc_weakness_stats',
        title: 'Backtest BTC weakness statistics',
        generatedAtUtc: '2026-04-02T12:00:00.000Z',
        sections: [
            {
                sectionKey: 'btc_weakness_stats_config',
                title: 'Config',
                items: [
                    { itemKey: 'ema_gap_default', key: 'EMA gap default', value: '0.2%' },
                    { itemKey: 'ret1_drop_default', key: 'Ret1 drop default', value: '0.0%' },
                    { itemKey: 'ret30_drop_default', key: 'Ret30 drop default', value: '0.0%' }
                ]
            },
            {
                sectionKey: 'owner_rule_summary',
                title: 'Summary',
                items: [
                    { itemKey: 'trigger_days', key: 'Trigger days', value: '14' },
                    { itemKey: 'trigger_rate', key: 'Trigger rate', value: '11.20%' },
                    { itemKey: 'up_to_flat_days', key: 'Up to flat days', value: '8' },
                    { itemKey: 'accuracy_owner_default', key: 'Accuracy owner default', value: '57.10%' },
                    { itemKey: 'accuracy_delta_vs_before_block', key: 'Accuracy delta', value: '+1.25 pp' }
                ]
            },
            {
                sectionKey: 'ema_sweep',
                title: 'EMA sweep',
                columns: ['Threshold', 'TriggerDays'],
                rows: [['0.2%', '14']]
            }
        ]
    }
}

function createLiveReport() {
    return {
        schemaVersion: 1,
        id: 'btc-weakness-live-report',
        kind: 'statistics_btc_weakness_live',
        title: 'Live BTC weakness statistics',
        generatedAtUtc: '2026-04-02T12:05:00.000Z',
        sections: [
            {
                sectionKey: 'live_btc_weakness_scope',
                title: 'Scope',
                items: [
                    { itemKey: 'used_days', key: 'Used days', value: '9' },
                    { itemKey: 'finalized_with_fact_days', key: 'Finalized with fact days', value: '12' },
                    { itemKey: 'missing_indicators_days', key: 'Missing indicator days', value: '2' },
                    { itemKey: 'missing_raw_btc_weakness_inputs_days', key: 'Missing raw input days', value: '1' }
                ]
            },
            {
                sectionKey: 'live_btc_weakness_owner_summary',
                title: 'Live summary',
                items: [
                    { itemKey: 'trigger_days', key: 'Trigger days', value: '3' },
                    { itemKey: 'trigger_rate', key: 'Trigger rate', value: '33.33%' },
                    { itemKey: 'up_to_flat_days', key: 'Up to flat days', value: '2' },
                    { itemKey: 'accuracy_owner_default', key: 'Accuracy owner default', value: '66.67%' },
                    { itemKey: 'accuracy_delta_vs_before_block', key: 'Accuracy delta', value: '+4.00 pp' }
                ]
            },
            {
                sectionKey: 'joint_rule_behavior',
                title: 'Joint rule behavior',
                columns: ['Threshold', 'TriggerDays'],
                rows: [['EMA 0.2% | Ret1 0.0% | Ret30 0.0%', '3']]
            }
        ]
    }
}

describe('BtcWeaknessStatsPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        vi.clearAllMocks()

        useBacktestBtcWeaknessStatsReportQuery.mockReturnValue(
            createQueryResult({
                data: createBacktestReport()
            })
        )
        useStatisticsBtcWeaknessLiveReportQuery.mockReturnValue(
            createQueryResult({
                data: createLiveReport()
            })
        )
    })

    test('renders summary cards, shared terms block, and both report sections', () => {
        render(<BtcWeaknessStatsPage />)

        expect(screen.getByText('Статистика слабости Bitcoin')).toBeInTheDocument()
        expect(screen.getByText('Короткая сводка правила')).toBeInTheDocument()
        expect(screen.getByText('Рабочие пороги проекта')).toBeInTheDocument()
        expect(screen.getByText('Статистика на истории')).toBeInTheDocument()
        expect(screen.getByText('Статистика по реальным дням')).toBeInTheDocument()
        expect(screen.getByText('Термины таблиц')).toBeInTheDocument()
        expect(screen.getAllByText('0.2%').length).toBeGreaterThan(0)
        expect(screen.getAllByText('66.67%').length).toBeGreaterThan(0)
        expect(screen.getByText('EMA sweep')).toBeInTheDocument()
        expect(screen.getByText('Joint rule behavior')).toBeInTheDocument()
    })

    test('keeps the page shell visible when both report queries fail', () => {
        useBacktestBtcWeaknessStatsReportQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('history failed')
            })
        )
        useStatisticsBtcWeaknessLiveReportQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('live failed')
            })
        )

        render(<BtcWeaknessStatsPage />)

        expect(screen.getByText('Статистика слабости Bitcoin')).toBeInTheDocument()
        expect(screen.getByText('Не удалось загрузить статистику на истории по слабости Bitcoin')).toBeInTheDocument()
        expect(screen.getByText('Не удалось загрузить статистику по реальным дням по слабости Bitcoin')).toBeInTheDocument()
        expect(screen.queryByText('EMA sweep')).not.toBeInTheDocument()
    })
})
