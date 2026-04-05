import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import type { QueryClient, UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import {
    prefetchPublishedReportVariantCatalog,
    PUBLISHED_REPORT_VARIANT_FAMILIES
} from './reportVariants'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

const BACKTEST_BOUNDED_PARAMETER_STATS_QUERY_KEY = ['backtest', 'bounded-parameter-stats'] as const
const { path } = API_ROUTES.backtest.boundedParameterStatsGet

export interface BacktestBoundedParameterStatsQueryArgs {
    owner?: string | null
    parameter?: string | null
}

interface BacktestBoundedParameterStatsQueryOptions {
    enabled?: boolean
}

function buildBacktestBoundedParameterStatsPath(args?: BacktestBoundedParameterStatsQueryArgs): string {
    const params = new URLSearchParams()

    if (args?.owner) params.set('owner', args.owner)
    if (args?.parameter) params.set('parameter', args.parameter)

    const query = params.toString()
    return query ? `${path}?${query}` : path
}

function buildBacktestBoundedParameterStatsQueryKey(args?: BacktestBoundedParameterStatsQueryArgs) {
    return [
        ...BACKTEST_BOUNDED_PARAMETER_STATS_QUERY_KEY,
        args?.owner ?? null,
        args?.parameter ?? null
    ] as const
}

async function fetchBacktestBoundedParameterStatsReport(
    args?: BacktestBoundedParameterStatsQueryArgs
): Promise<ReportDocumentDto> {
    const reportPath = buildBacktestBoundedParameterStatsPath(args)
    const response = await fetch(`${API_BASE_URL}${reportPath}`)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load bounded parameter stats report', response, text))
    }

    return mapReportResponse(await response.json())
}

export function useBacktestBoundedParameterStatsReportQuery(
    args?: BacktestBoundedParameterStatsQueryArgs,
    options?: BacktestBoundedParameterStatsQueryOptions
): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: buildBacktestBoundedParameterStatsQueryKey(args),
        queryFn: () => fetchBacktestBoundedParameterStatsReport(args),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export async function prefetchBacktestBoundedParameterStatsReport(
    queryClient: QueryClient,
    args?: BacktestBoundedParameterStatsQueryArgs
): Promise<void> {
    await Promise.all([
        prefetchPublishedReportVariantCatalog(queryClient, PUBLISHED_REPORT_VARIANT_FAMILIES.backtestBoundedParameterStats),
        queryClient.prefetchQuery({
            queryKey: buildBacktestBoundedParameterStatsQueryKey(args),
            queryFn: () => fetchBacktestBoundedParameterStatsReport(args)
        })
    ])
}
