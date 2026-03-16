import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import ExecutionPipelinePage from './ExecutionPipelinePage'

const { useBacktestExecutionPipelineReportQuery } = vi.hoisted(() => ({
    useBacktestExecutionPipelineReportQuery: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/backtestExecutionPipeline', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/backtestExecutionPipeline')>()

    return {
        ...actual,
        useBacktestExecutionPipelineReportQuery
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
                columns: ['Policy', 'TradeDays'],
                rows: [['const_2x', '11']],
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

describe('ExecutionPipelinePage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        vi.clearAllMocks()
        useBacktestExecutionPipelineReportQuery.mockReturnValue(
            createQueryResult({
                data: createExecutionPipelineReport()
            })
        )
    })

    test('renders universal slice controls and forwards current diagnostics query to the backend hook', () => {
        render(<ExecutionPipelinePage />, {
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

    test('keeps universal controls visible and disables backend fetch when diagnostics query is invalid', () => {
        render(<ExecutionPipelinePage />, {
            route: '/analysis/execution-pipeline?bucket=broken'
        })

        expect(screen.getByText('Dynamic-risk режим')).toBeInTheDocument()
        expect(screen.getByText('SL-режим')).toBeInTheDocument()
        expect(screen.getByText('Бакет сделок')).toBeInTheDocument()
        expect(screen.getByText('Зональный риск')).toBeInTheDocument()

        expect(useBacktestExecutionPipelineReportQuery).toHaveBeenCalledWith(
            {
                bucket: 'daily',
                slMode: 'all',
                tpSlMode: 'all',
                zonalMode: 'with-zonal'
            },
            { enabled: false }
        )
    })

    test('renders terms blocks for key-value and table sections', () => {
        render(<ExecutionPipelinePage />, {
            route: '/analysis/execution-pipeline'
        })

        expect(screen.getAllByText('Термины секции')).toHaveLength(3)
        expect(screen.getAllByRole('button', { name: 'Скрыть блок' })).toHaveLength(3)
    })
})
