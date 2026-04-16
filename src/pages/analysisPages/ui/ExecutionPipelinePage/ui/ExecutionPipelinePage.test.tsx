import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import ExecutionPipelinePage from './ExecutionPipelinePage'

const { useBacktestExecutionPipelineReportQuery } = vi.hoisted(() => ({
    useBacktestExecutionPipelineReportQuery: vi.fn()
}))
const { usePublishedReportVariantCatalogQuery } = vi.hoisted(() => ({
    usePublishedReportVariantCatalogQuery: vi.fn()
}))
const FIXED_SPLIT_INITIAL_STATE = {
    mode: {
        activeMode: 'directional_fixed_split' as const
    }
}

vi.mock('@/shared/api/tanstackQueries/backtestExecutionPipeline', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/backtestExecutionPipeline')>()

    return {
        ...actual,
        useBacktestExecutionPipelineReportQuery
    }
})

vi.mock('@/shared/api/tanstackQueries/reportVariants', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/reportVariants')>()

    return {
        ...actual,
        usePublishedReportVariantCatalogQuery
    }
})

function createQueryResult(overrides: Record<string, unknown> = {}) {
    return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        ...overrides
    }
}

function createExecutionPipelineReport() {
    return {
        schemaVersion: 1,
        id: 'execution-pipeline-test',
        kind: 'backtest_execution_pipeline',
        title: 'Execution Pipeline',
        generatedAtUtc: '2026-03-11T12:00:00.000Z',
        sections: [
            {
                sectionKey: 'pipeline_scope',
                title: 'Pipeline Scope',
                items: [
                    { itemKey: 'calc_mode', key: 'CalcMode', value: 'Compound' },
                    { itemKey: 'bucket', key: 'Bucket', value: 'daily' }
                ],
                metadata: {
                    kind: 'unknown',
                    tpSlMode: 'all',
                    zonalMode: 'with-zonal',
                    mode: 'all',
                    bucket: 'daily'
                }
            },
            {
                sectionKey: 'model_level',
                title: 'Model Level',
                columns: ['SignalDays', 'LongSignalDays'],
                rows: [['42', '21']]
            },
            {
                sectionKey: 'decision_level',
                title: 'Decision Level',
                columns: ['Policy', 'Margin', 'TradeDays'],
                columnKeys: ['policy_name', 'margin_mode', 'trade_days'],
                rows: [['const_2x Cross', 'Cross', '11']],
                metadata: {
                    kind: 'unknown',
                    tpSlMode: 'all',
                    zonalMode: 'with-zonal',
                    mode: 'all',
                    bucket: 'daily'
                }
            }
        ]
    }
}

function createVariantCatalog() {
    return {
        family: 'backtest_execution_pipeline',
        sourceReportKind: 'backtest_execution_pipeline',
        sourceReportId: 'execution-pipeline-test',
        publishedAtUtc: '2026-03-11T12:00:00.000Z',
        axes: [
            {
                key: 'bucket',
                defaultValue: 'daily',
                options: [
                    { value: 'daily', label: 'Daily' },
                    { value: 'intraday', label: 'Intraday' }
                ]
            },
            {
                key: 'tpsl',
                defaultValue: 'all',
                options: [
                    { value: 'all', label: 'All' },
                    { value: 'static', label: 'Static' }
                ]
            },
            {
                key: 'slmode',
                defaultValue: 'all',
                options: [
                    { value: 'all', label: 'All' },
                    { value: 'no-sl', label: 'No SL' }
                ]
            },
            {
                key: 'zonal',
                defaultValue: 'with-zonal',
                options: [
                    { value: 'with-zonal', label: 'With zonal' },
                    { value: 'without-zonal', label: 'Without zonal' }
                ]
            }
        ],
        variants: [
            {
                key: 'default',
                selection: {
                    bucket: 'daily',
                    tpsl: 'all',
                    slmode: 'all',
                    zonal: 'with-zonal'
                },
                artifacts: { report: 'default-report' }
            },
            {
                key: 'strict-intraday',
                selection: {
                    bucket: 'intraday',
                    tpsl: 'static',
                    slmode: 'no-sl',
                    zonal: 'without-zonal'
                },
                artifacts: { report: 'strict-intraday-report' }
            }
        ]
    }
}

describe('ExecutionPipelinePage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        vi.clearAllMocks()
        usePublishedReportVariantCatalogQuery.mockReturnValue(
            createQueryResult({
                data: createVariantCatalog(),
                isPending: false,
                isError: false,
                error: null,
                refetch: vi.fn()
            })
        )
        useBacktestExecutionPipelineReportQuery.mockReturnValue(
            createQueryResult({
                data: createExecutionPipelineReport()
            })
        )
    })

    test('renders universal slice controls and forwards current diagnostics query to the backend hook', () => {
        render(<ExecutionPipelinePage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/execution-pipeline?bucket=intraday&slmode=no-sl&tpsl=static&zonal=without-zonal'
        })

        expect(screen.getByText('Dynamic-risk режим')).toBeInTheDocument()
        expect(screen.getByText('SL-режим')).toBeInTheDocument()
        expect(screen.getByText('Бакет сделок')).toBeInTheDocument()
        expect(screen.getByText('Зональный риск')).toBeInTheDocument()

        expect(useBacktestExecutionPipelineReportQuery).toHaveBeenCalledWith(
            {
                bucket: 'intraday',
                slMode: 'no-sl',
                tpSlMode: 'static',
                zonalMode: 'without-zonal'
            },
            { enabled: true }
        )
    })

    test('shows owner error state and disables backend fetch when diagnostics query is invalid', () => {
        render(<ExecutionPipelinePage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/execution-pipeline?bucket=broken'
        })

        expect(useBacktestExecutionPipelineReportQuery).toHaveBeenCalledWith(
            undefined,
            { enabled: false }
        )

        expect(screen.getByText('Не удалось загрузить путь расчёта')).toBeInTheDocument()
        expect(screen.getByText(/unsupported for axis 'bucket'/i)).toBeInTheDocument()
    })

    test('renders terms blocks for key-value and table sections', () => {
        render(<ExecutionPipelinePage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/execution-pipeline'
        })

        expect(screen.getAllByText('Термины секции')).toHaveLength(3)
        expect(screen.getAllByRole('button', { name: 'Скрыть блок' })).toHaveLength(3)
    })

    test('hides duplicate margin column when policy name already shows Cross or Isolated', () => {
        render(<ExecutionPipelinePage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/execution-pipeline'
        })

        expect(screen.getByText('const_2x Cross')).toBeInTheDocument()
        expect(screen.queryByRole('columnheader', { name: 'Margin' })).not.toBeInTheDocument()
        expect(screen.queryByText('Margin')).not.toBeInTheDocument()
    })
})
