import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import { API_ROUTES } from '../routes'
import { mapReportResponse } from '../utils/mapReportResponse'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

const BACKTEST_SL_OVERLAY_STATS_QUERY_KEY = ['backtest', 'sl-overlay-stats'] as const
const { path } = API_ROUTES.backtest.slOverlayStatsGet

async function fetchBacktestSlOverlayStatsReport(): Promise<ReportDocumentDto> {
    const response = await fetch(`${API_BASE_URL}${path}`)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load SL overlay stats report', response, text))
    }

    return mapReportResponse(await response.json())
}

export function useBacktestSlOverlayStatsReportQuery(): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: BACKTEST_SL_OVERLAY_STATS_QUERY_KEY,
        queryFn: fetchBacktestSlOverlayStatsReport,
        retry: false
    })
}

export async function prefetchBacktestSlOverlayStatsReport(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: BACKTEST_SL_OVERLAY_STATS_QUERY_KEY,
        queryFn: fetchBacktestSlOverlayStatsReport
    })
}
