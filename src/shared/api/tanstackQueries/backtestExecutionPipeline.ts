import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { BacktestSliceReportQueryArgs } from './backtestDiagnostics'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'

const BACKTEST_EXECUTION_PIPELINE_QUERY_KEY = ['backtest', 'execution-pipeline'] as const
const { path } = API_ROUTES.backtest.executionPipelineGet

interface BacktestExecutionPipelineQueryOptions {
    enabled?: boolean
}

function buildBacktestExecutionPipelinePath(args?: BacktestSliceReportQueryArgs): string {
    const params = new URLSearchParams()

    if (args?.bucket) {
        params.set('bucket', args.bucket)
    }
    if (args?.tpSlMode) {
        params.set('tpsl', args.tpSlMode)
    }
    if (args?.slMode) {
        params.set('slmode', args.slMode)
    }
    if (args?.zonalMode) {
        params.set('zonal', args.zonalMode)
    }

    const query = params.toString()
    return query ? `${path}?${query}` : path
}

function buildBacktestExecutionPipelineQueryKey(args?: BacktestSliceReportQueryArgs) {
    return [
        ...BACKTEST_EXECUTION_PIPELINE_QUERY_KEY,
        args?.bucket ?? null,
        args?.tpSlMode ?? null,
        args?.slMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

async function fetchBacktestExecutionPipelineReport(args?: BacktestSliceReportQueryArgs): Promise<ReportDocumentDto> {
    const reportPath = buildBacktestExecutionPipelinePath(args)
    const resp = await fetch(`${API_BASE_URL}${reportPath}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load execution pipeline report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

export function useBacktestExecutionPipelineReportQuery(
    args?: BacktestSliceReportQueryArgs,
    options?: BacktestExecutionPipelineQueryOptions
): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: buildBacktestExecutionPipelineQueryKey(args),
        queryFn: () => fetchBacktestExecutionPipelineReport(args),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export async function prefetchBacktestExecutionPipelineReport(
    queryClient: QueryClient,
    args?: BacktestSliceReportQueryArgs
): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: buildBacktestExecutionPipelineQueryKey(args),
        queryFn: () => fetchBacktestExecutionPipelineReport(args),
        retry: false
    })
}
