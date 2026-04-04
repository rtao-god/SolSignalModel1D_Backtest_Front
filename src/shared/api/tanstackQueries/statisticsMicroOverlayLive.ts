import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import { API_ROUTES } from '../routes'
import { mapReportResponse } from '../utils/mapReportResponse'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

const STATISTICS_MICRO_OVERLAY_LIVE_QUERY_KEY = ['statistics', 'micro-overlay-live'] as const
const { path } = API_ROUTES.statistics.microOverlayLiveGet

async function fetchStatisticsMicroOverlayLiveReport(): Promise<ReportDocumentDto> {
    const response = await fetch(`${API_BASE_URL}${path}`)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load live micro overlay stats report', response, text))
    }

    return mapReportResponse(await response.json())
}

export function useStatisticsMicroOverlayLiveReportQuery(): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: STATISTICS_MICRO_OVERLAY_LIVE_QUERY_KEY,
        queryFn: fetchStatisticsMicroOverlayLiveReport,
        retry: false
    })
}

export async function prefetchStatisticsMicroOverlayLiveReport(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: STATISTICS_MICRO_OVERLAY_LIVE_QUERY_KEY,
        queryFn: fetchStatisticsMicroOverlayLiveReport
    })
}
