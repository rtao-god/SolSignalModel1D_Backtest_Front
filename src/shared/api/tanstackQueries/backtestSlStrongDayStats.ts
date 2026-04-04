import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import { API_ROUTES } from '../routes'
import { mapReportResponse } from '../utils/mapReportResponse'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

const BACKTEST_SL_STRONG_DAY_STATS_QUERY_KEY = ['backtest', 'sl-strong-day-stats'] as const
const { path } = API_ROUTES.backtest.slStrongDayStatsGet

async function fetchBacktestSlStrongDayStatsReport(): Promise<ReportDocumentDto> {
    const response = await fetch(`${API_BASE_URL}${path}`)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load SL strong-day stats report', response, text))
    }

    return mapReportResponse(await response.json())
}

export function useBacktestSlStrongDayStatsReportQuery(): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: BACKTEST_SL_STRONG_DAY_STATS_QUERY_KEY,
        queryFn: fetchBacktestSlStrongDayStatsReport,
        retry: false
    })
}

export async function prefetchBacktestSlStrongDayStatsReport(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: BACKTEST_SL_STRONG_DAY_STATS_QUERY_KEY,
        queryFn: fetchBacktestSlStrongDayStatsReport
    })
}
