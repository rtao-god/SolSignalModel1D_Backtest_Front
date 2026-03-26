import { vi } from 'vitest'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import type { AggregationMetricsSnapshotDto, AggregationProbsSnapshotDto } from '@/shared/types/aggregation.types'
import AggregationStatsPage from './AggregationStatsPage'
import { AggregationStatsPageInner } from './AggregationStatsPageInner'

vi.mock('@/shared/lib/i18n', async () => {
    const actual = await vi.importActual<typeof import('@/shared/lib/i18n')>('@/shared/lib/i18n')

    return {
        ...actual,
        useLocale: () => ({
            locale: 'ru',
            intlLocale: 'ru-RU'
        })
    }
})

const MOCK_PROBS: AggregationProbsSnapshotDto = {
    MinDateUtc: '2026-01-01',
    MaxDateUtc: '2026-01-31',
    TotalInputRecords: 31,
    ExcludedCount: 2,
    Segments: [
        {
            SegmentName: 'oos',
            SegmentLabel: 'OOS',
            FromDateUtc: '2026-01-01',
            ToDateUtc: '2026-01-31',
            RecordsCount: 29,
            Day: { PUp: 0.42, PFlat: 0.31, PDown: 0.27, Sum: 1 },
            DayMicro: { PUp: 0.4, PFlat: 0.34, PDown: 0.26, Sum: 1 },
            Total: { PUp: 0.37, PFlat: 0.38, PDown: 0.25, Sum: 1 },
            AvgConfDay: 0.61,
            AvgConfMicro: 0.54,
            RecordsWithSlScore: 11
        }
    ],
    DebugLastDays: [
        {
            DateUtc: '2026-01-31',
            TrueLabel: 'Up',
            PredDay: 'Up',
            PredDayMicro: 'Flat',
            PredTotal: 'Flat',
            PDay: { Up: 0.61, Flat: 0.24, Down: 0.15, Sum: 1 },
            PDayMicro: { Up: 0.44, Flat: 0.39, Down: 0.17, Sum: 1 },
            PTotal: { Up: 0.33, Flat: 0.5, Down: 0.17, Sum: 1 },
            MicroUsed: true,
            SlUsed: true,
            MicroAgree: false,
            SlPenLong: true,
            SlPenShort: false
        }
    ]
}

const MOCK_LAYER = {
    LayerName: 'Day',
    Confusion: [
        [5, 1, 0],
        [1, 4, 1],
        [0, 2, 6]
    ],
    N: 20,
    Correct: 15,
    Accuracy: 0.75,
    MicroF1: 0.75,
    LogLoss: 0.4412,
    InvalidForLogLoss: 0,
    ValidForLogLoss: 20
}

const MOCK_METRICS: AggregationMetricsSnapshotDto = {
    TotalInputRecords: 31,
    ExcludedCount: 2,
    Segments: [
        {
            SegmentName: 'oos',
            SegmentLabel: 'OOS',
            FromDateUtc: '2026-01-01',
            ToDateUtc: '2026-01-31',
            RecordsCount: 29,
            Day: { ...MOCK_LAYER, LayerName: 'Day' },
            DayMicro: { ...MOCK_LAYER, LayerName: 'Day+Micro' },
            Total: { ...MOCK_LAYER, LayerName: 'Total' }
        }
    ]
}

vi.mock('@/shared/api/tanstackQueries/aggregation', () => ({
    useAggregationProbsQuery: () => ({
        data: MOCK_PROBS,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn()
    }),
    useAggregationMetricsQuery: () => ({
        data: MOCK_METRICS,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn()
    })
}))

describe('AggregationStatsPage', () => {
    afterEach(async () => {
        await i18nForTests.changeLanguage('en')
    })

    test('keeps the page header compact and does not repeat section explanations', () => {
        render(<AggregationStatsPage />)

        expect(screen.queryByText(/Блок «Вероятности» нужен для чтения среднего наклона прогноза/i)).toBeNull()
        expect(
            screen.queryByText(/Блок «Метрики» нужен для чтения качества ответа/i)
        ).toBeNull()
        expect(
            screen.queryByText(/Блок «Разбор последних дней» нужен для проверки конкретных дат/i)
        ).toBeNull()
    })

    test('removes repeated inner hints and keeps only the local block labels', () => {
        render(<AggregationStatsPageInner probs={MOCK_PROBS} metrics={MOCK_METRICS} showHeader={false} embedded />)

        expect(screen.queryByText(/Матрица ошибок нужна, когда общей точности уже мало/i)).toBeNull()
        expect(screen.queryByText(/Каждая строка — один торговый день/i)).toBeNull()
        expect(screen.getAllByText(/Confusion matrix/i)).toHaveLength(3)
        expect(screen.getByText(/Quality of the same layers on the same segments/i)).not.toBeNull()
        expect(screen.getByText(/Recent dates one by one/i)).not.toBeNull()
    })

    test('shows Russian labels for generic aggregation UI text without renaming canonical layer ids', async () => {
        await i18nForTests.changeLanguage('ru')

        render(<AggregationStatsPageInner probs={MOCK_PROBS} metrics={MOCK_METRICS} showHeader={false} embedded />)

        expect(screen.getAllByText('Факт').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Точность').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Факт → прогноз').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Day').length).toBeGreaterThan(0)
        expect(screen.queryByText(/^True$/)).toBeNull()
    })
})
