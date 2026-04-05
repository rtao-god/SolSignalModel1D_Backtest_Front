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

const MODEL_STATS_QUERY_KEY = ['ml', 'stats', 'per-model'] as const
const { path } = API_ROUTES.ml.modelStatsPerModel

export interface ModelStatsReportQueryArgs {
    segment?: string | null
    view?: string | null
}

interface ModelStatsReportQueryOptions {
    enabled?: boolean
}

function buildModelStatsReportPath(args?: ModelStatsReportQueryArgs): string {
    const params = new URLSearchParams()

    if (args?.segment) {
        params.set('segment', args.segment)
    }

    if (args?.view) {
        params.set('view', args.view)
    }

    const query = params.toString()
    return query ? `${path}?${query}` : path
}

function buildModelStatsQueryKey(args?: ModelStatsReportQueryArgs) {
    return [...MODEL_STATS_QUERY_KEY, args?.segment ?? null, args?.view ?? null] as const
}

async function fetchModelStatsReport(args?: ModelStatsReportQueryArgs): Promise<ReportDocumentDto> {
    const reportPath = buildModelStatsReportPath(args)
    const resp = await fetch(`${API_BASE_URL}${reportPath}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load model stats report', resp, text))
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

export function useModelStatsReportQuery(
    args?: ModelStatsReportQueryArgs,
    options?: ModelStatsReportQueryOptions
): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: buildModelStatsQueryKey(args),
        queryFn: () => fetchModelStatsReport(args),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export async function prefetchModelStatsReport(
    queryClient: QueryClient,
    args?: ModelStatsReportQueryArgs
): Promise<void> {
    await Promise.all([
        prefetchPublishedReportVariantCatalog(queryClient, PUBLISHED_REPORT_VARIANT_FAMILIES.backtestModelStats),
        queryClient.prefetchQuery({
            queryKey: buildModelStatsQueryKey(args),
            queryFn: () => fetchModelStatsReport(args)
        })
    ])
}
