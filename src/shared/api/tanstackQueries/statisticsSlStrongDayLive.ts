import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import { API_ROUTES } from '../routes'
import { mapReportResponse } from '../utils/mapReportResponse'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

const STATISTICS_SL_STRONG_DAY_LIVE_QUERY_KEY = ['statistics', 'sl-strong-day-live'] as const
const { path } = API_ROUTES.statistics.slStrongDayLiveGet

async function fetchStatisticsSlStrongDayLiveReport(): Promise<ReportDocumentDto> {
    const response = await fetch(`${API_BASE_URL}${path}`)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load live SL strong-day stats report', response, text))
    }

    return mapReportResponse(await response.json())
}

export function useStatisticsSlStrongDayLiveReportQuery(): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: STATISTICS_SL_STRONG_DAY_LIVE_QUERY_KEY,
        queryFn: fetchStatisticsSlStrongDayLiveReport,
        retry: false
    })
}

export async function prefetchStatisticsSlStrongDayLiveReport(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: STATISTICS_SL_STRONG_DAY_LIVE_QUERY_KEY,
        queryFn: fetchStatisticsSlStrongDayLiveReport
    })
}
