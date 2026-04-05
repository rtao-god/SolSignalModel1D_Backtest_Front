import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import MicroOverlayStatsPage from './MicroOverlayStatsPage'

const { useBacktestMicroOverlayStatsReportQuery } = vi.hoisted(() => ({
    useBacktestMicroOverlayStatsReportQuery: vi.fn()
}))
const { useStatisticsMicroOverlayLiveReportQuery } = vi.hoisted(() => ({
    useStatisticsMicroOverlayLiveReportQuery: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/backtestMicroOverlayStats', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/backtestMicroOverlayStats')>()

    return {
        ...actual,
        useBacktestMicroOverlayStatsReportQuery
    }
})

vi.mock('@/shared/api/tanstackQueries/statisticsMicroOverlayLive', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/statisticsMicroOverlayLive')>()

    return {
        ...actual,
        useStatisticsMicroOverlayLiveReportQuery
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
        id: 'micro-overlay-backtest-report',
        kind: 'backtest_micro_overlay_stats',
        title: 'Backtest micro overlay statistics',
        generatedAtUtc: '2026-04-03T09:00:00.000Z',
        sections: [
            {
                sectionKey: 'micro_overlay_stats_config',
                title: 'Config',
                items: [
                    { itemKey: 'min_confidence_default', key: 'Min confidence', value: '0.55' },
                    { itemKey: 'strong_confidence_default', key: 'Strong confidence', value: '0.70' },
                    { itemKey: 'max_impact_default', key: 'Max impact', value: '30.00%' },
                    { itemKey: 'beta_micro_default', key: 'Beta micro', value: '1.00' }
                ]
            },
            {
                sectionKey: 'owner_rule_summary',
                title: 'Summary',
                items: [
                    { itemKey: 'base_flat_days', key: 'Base flat days', value: '41' },
                    { itemKey: 'gate_passed_days', key: 'Gate-passed days', value: '24' },
                    { itemKey: 'changed_days', key: 'Changed days', value: '17' },
                    { itemKey: 'micro_truth_accuracy_gate_passed', key: 'Micro truth accuracy', value: '62.50%' },
                    { itemKey: 'average_actual_impact_gate_passed', key: 'Average actual impact', value: '11.40%' }
                ]
            },
            {
                sectionKey: 'micro_strength_sweep',
                title: 'Micro strength sweep',
                columns: ['Threshold', 'GatePassedDays'],
                rows: [['0.55', '24']]
            }
        ]
    }
}

function createLiveReport() {
    return {
        schemaVersion: 1,
        id: 'micro-overlay-live-report',
        kind: 'statistics_micro_overlay_live',
        title: 'Live micro overlay statistics',
        generatedAtUtc: '2026-04-03T09:05:00.000Z',
        sections: [
            {
                sectionKey: 'live_micro_overlay_scope',
                title: 'Scope',
                items: [
                    { itemKey: 'used_days', key: 'Used days', value: '8' },
                    { itemKey: 'finalized_with_fact_days', key: 'Finalized with fact days', value: '10' },
                    { itemKey: 'missing_raw_micro_inputs_days', key: 'Missing raw input days', value: '1' },
                    { itemKey: 'non_strict_live_days', key: 'Non-strict live days', value: '2' }
                ]
            },
            {
                sectionKey: 'live_micro_overlay_owner_summary',
                title: 'Live summary',
                items: [
                    { itemKey: 'base_flat_days', key: 'Base flat days', value: '5' },
                    { itemKey: 'gate_passed_days', key: 'Gate-passed days', value: '4' },
                    { itemKey: 'changed_days', key: 'Changed days', value: '3' },
                    { itemKey: 'micro_truth_accuracy_gate_passed', key: 'Micro truth accuracy', value: '75.00%' },
                    { itemKey: 'average_actual_impact_gate_passed', key: 'Average actual impact', value: '13.00%' }
                ]
            },
            {
                sectionKey: 'live_micro_overlay_behavior',
                title: 'Live overlay behavior',
                columns: ['Threshold', 'GatePassedDays'],
                rows: [['0.55', '4']]
            }
        ]
    }
}

describe('MicroOverlayStatsPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        vi.clearAllMocks()

        useBacktestMicroOverlayStatsReportQuery.mockReturnValue(
            createQueryResult({
                data: createBacktestReport()
            })
        )
        useStatisticsMicroOverlayLiveReportQuery.mockReturnValue(
            createQueryResult({
                data: createLiveReport()
            })
        )
    })

    test('renders summary cards, glossary, and both report panes', () => {
        render(<MicroOverlayStatsPage />)

        expect(screen.getByText('Статистика микро-слоя')).toBeInTheDocument()
        expect(screen.getByText('Короткая сводка правила')).toBeInTheDocument()
        expect(screen.getByText('Рабочие пороги проекта')).toBeInTheDocument()
        expect(screen.getByText('Сводка на истории')).toBeInTheDocument()
        expect(screen.getByText('Сводка по реальным дням')).toBeInTheDocument()
        expect(screen.getByText('Покрытие реальных дней')).toBeInTheDocument()
        expect(screen.getByText('Термины таблиц')).toBeInTheDocument()
        expect(screen.getAllByText('0.55').length).toBeGreaterThan(0)
        expect(screen.getAllByText('75.00%').length).toBeGreaterThan(0)
        expect(screen.getByText('Micro strength sweep')).toBeInTheDocument()
        expect(screen.getByText('Live overlay behavior')).toBeInTheDocument()
    })

    test('keeps the page shell visible when both report queries fail', () => {
        useBacktestMicroOverlayStatsReportQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('history failed')
            })
        )
        useStatisticsMicroOverlayLiveReportQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('live failed')
            })
        )

        render(<MicroOverlayStatsPage />)

        expect(screen.getByText('Статистика микро-слоя')).toBeInTheDocument()
        expect(screen.getByText('Не удалось загрузить статистику микро-слоя на истории')).toBeInTheDocument()
        expect(screen.getByText('Не удалось загрузить статистику микро-слоя по реальным дням')).toBeInTheDocument()
        expect(screen.queryByText('Micro strength sweep')).not.toBeInTheDocument()
    })
})
