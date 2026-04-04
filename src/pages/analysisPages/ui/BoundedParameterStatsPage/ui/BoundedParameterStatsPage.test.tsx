import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import BoundedParameterStatsPage from './BoundedParameterStatsPage'

const { useBacktestBoundedParameterStatsReportQuery } = vi.hoisted(() => ({
    useBacktestBoundedParameterStatsReportQuery: vi.fn()
}))
const { usePublishedReportVariantCatalogQuery } = vi.hoisted(() => ({
    usePublishedReportVariantCatalogQuery: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/backtestBoundedParameterStats', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/backtestBoundedParameterStats')>()

    return {
        ...actual,
        useBacktestBoundedParameterStatsReportQuery
    }
})

vi.mock('@/shared/api/tanstackQueries/reportVariants', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/reportVariants')>()

    return {
        ...actual,
        usePublishedReportVariantCatalogQuery
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

function createVariantCatalog() {
    return {
        family: 'backtest_bounded_parameter_stats',
        sourceReportKind: 'backtest_bounded_parameter_stats',
        sourceReportId: 'catalog-1',
        publishedAtUtc: '2026-04-02T12:00:00.000Z',
        axes: [
            {
                key: 'owner',
                defaultValue: 'min_move',
                options: [{ value: 'min_move', label: 'MinMove' }]
            },
            {
                key: 'parameter',
                defaultValue: 'atr_pct_cap',
                options: [
                    { value: 'atr_pct_cap', label: 'ATR cap' },
                    { value: 'min_floor', label: 'MinMove floor' }
                ]
            }
        ],
        variants: [
            {
                key: 'min_move__atr_pct_cap',
                selection: { owner: 'min_move', parameter: 'atr_pct_cap' },
                artifacts: { report: 'min_move__atr_pct_cap.json' }
            },
            {
                key: 'min_move__min_floor',
                selection: { owner: 'min_move', parameter: 'min_floor' },
                artifacts: { report: 'min_move__min_floor.json' }
            }
        ]
    }
}

function createReport() {
    return {
        id: 'bounded-parameter-stats-report',
        kind: 'backtest_bounded_parameter_stats',
        title: 'Backtest bounded parameter statistics',
        generatedAtUtc: '2026-04-02T12:00:00.000Z',
        sections: [
            {
                title: 'Selected bounded parameter',
                items: [
                    { key: 'Owner', value: 'MinMove' },
                    { key: 'Parameter', value: 'ATR cap' }
                ]
            },
            {
                title: 'Bounded parameter leaderboard',
                columns: ['Rank', 'Candidate%', 'OosMeanAuc'],
                rows: [['1', '25%', '0.612']]
            }
        ]
    }
}

describe('BoundedParameterStatsPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        vi.clearAllMocks()

        usePublishedReportVariantCatalogQuery.mockReturnValue(
            createQueryResult({
                data: createVariantCatalog()
            })
        )
        useBacktestBoundedParameterStatsReportQuery.mockReturnValue(
            createQueryResult({
                data: createReport()
            })
        )
    })

    test('renders controls and selected report for published owner/parameter selection', () => {
        render(<BoundedParameterStatsPage />, {
            route: '/statistics/bounded-parameter-stats'
        })

        expect(screen.getByText('Статистика ограничивающих параметров')).toBeInTheDocument()
        expect(screen.getByText('Группа ограничителей')).toBeInTheDocument()
        expect(screen.getByText('Ограничивающий параметр')).toBeInTheDocument()
        expect(screen.getByText('Selected bounded parameter')).toBeInTheDocument()
        expect(screen.getByText('Bounded parameter leaderboard')).toBeInTheDocument()
    })

    test('keeps hero visible when URL selection is invalid', () => {
        useBacktestBoundedParameterStatsReportQuery.mockReturnValue(
            createQueryResult()
        )

        render(<BoundedParameterStatsPage />, {
            route: '/statistics/bounded-parameter-stats?owner=broken'
        })

        expect(screen.getByText('Статистика ограничивающих параметров')).toBeInTheDocument()
        expect(screen.getByText('Не удалось загрузить статистику ограничивающих параметров')).toBeInTheDocument()
        expect(screen.queryByText('Selected bounded parameter')).not.toBeInTheDocument()
    })
})
