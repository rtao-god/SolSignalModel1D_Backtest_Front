import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import { API_ROUTES } from '../routes'
import { mapReportResponse } from '../utils/mapReportResponse'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

const BACKTEST_BTC_WEAKNESS_STATS_QUERY_KEY = ['backtest', 'btc-weakness-stats'] as const
const { path } = API_ROUTES.backtest.btcWeaknessStatsGet

async function fetchBacktestBtcWeaknessStatsReport(): Promise<ReportDocumentDto> {
    const response = await fetch(`${API_BASE_URL}${path}`)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load BTC weakness stats report', response, text))
    }

    return mapReportResponse(await response.json())
}

export function useBacktestBtcWeaknessStatsReportQuery(): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: BACKTEST_BTC_WEAKNESS_STATS_QUERY_KEY,
        queryFn: fetchBacktestBtcWeaknessStatsReport,
        retry: false
    })
}

export async function prefetchBacktestBtcWeaknessStatsReport(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: BACKTEST_BTC_WEAKNESS_STATS_QUERY_KEY,
        queryFn: fetchBacktestBtcWeaknessStatsReport
    })
}
