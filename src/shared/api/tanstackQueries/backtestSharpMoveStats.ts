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

const BACKTEST_SHARP_MOVE_STATS_QUERY_KEY = ['backtest', 'sharp-move-stats'] as const
const { path } = API_ROUTES.backtest.sharpMoveStatsGet

export interface BacktestSharpMoveStatsQueryArgs {
    scope?: string | null
    signal?: string | null
    outcome?: string | null
    threshold?: string | null
    horizon?: string | null
}

interface BacktestSharpMoveStatsQueryOptions {
    enabled?: boolean
}

function buildBacktestSharpMoveStatsPath(args?: BacktestSharpMoveStatsQueryArgs): string {
    const params = new URLSearchParams()

    if (args?.scope) params.set('scope', args.scope)
    if (args?.signal) params.set('signal', args.signal)
    if (args?.outcome) params.set('outcome', args.outcome)
    if (args?.threshold) params.set('threshold', args.threshold)
    if (args?.horizon) params.set('horizon', args.horizon)

    const query = params.toString()
    return query ? `${path}?${query}` : path
}

function buildBacktestSharpMoveStatsQueryKey(args?: BacktestSharpMoveStatsQueryArgs) {
    return [
        ...BACKTEST_SHARP_MOVE_STATS_QUERY_KEY,
        args?.scope ?? null,
        args?.signal ?? null,
        args?.outcome ?? null,
        args?.threshold ?? null,
        args?.horizon ?? null
    ] as const
}

async function fetchBacktestSharpMoveStatsReport(args?: BacktestSharpMoveStatsQueryArgs): Promise<ReportDocumentDto> {
    const reportPath = buildBacktestSharpMoveStatsPath(args)
    const resp = await fetch(`${API_BASE_URL}${reportPath}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load sharp-move stats report', resp, text))
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

export const useBacktestSharpMoveStatsReportQuery = (
    args?: BacktestSharpMoveStatsQueryArgs,
    options?: BacktestSharpMoveStatsQueryOptions
): UseQueryResult<ReportDocumentDto, Error> =>
    useQuery({
        queryKey: buildBacktestSharpMoveStatsQueryKey(args),
        queryFn: () => fetchBacktestSharpMoveStatsReport(args),
        enabled: options?.enabled ?? true,
        retry: false
    })

export async function prefetchBacktestSharpMoveStatsReport(
    queryClient: QueryClient,
    args?: BacktestSharpMoveStatsQueryArgs
): Promise<void> {
    await Promise.all([
        prefetchPublishedReportVariantCatalog(queryClient, PUBLISHED_REPORT_VARIANT_FAMILIES.backtestSharpMoveStats),
        queryClient.prefetchQuery({
            queryKey: buildBacktestSharpMoveStatsQueryKey(args),
            queryFn: () => fetchBacktestSharpMoveStatsReport(args)
        })
    ])
}
