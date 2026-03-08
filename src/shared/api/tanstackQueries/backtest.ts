import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { BacktestBaselineSnapshotDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../../configs/config'

const BACKTEST_BASELINE_SUMMARY_URL = '/backtest/summary'
const BACKTEST_BASELINE_SNAPSHOT_URL = '/backtest/baseline'
const BACKTEST_BASELINE_SNAPSHOT_QUERY_KEY = ['backtest', 'baseline', 'snapshot'] as const

function buildBacktestBaselineSummaryQueryOptions() {
    return {
        queryKey: ['backtest', 'summary', 'baseline'] as const,
        queryFn: fetchBacktestBaselineSummary,
        retry: false
    }
}

async function fetchBacktestBaselineSummary(): Promise<BacktestSummaryDto> {
    const resp = await fetch(`${API_BASE_URL}${BACKTEST_BASELINE_SUMMARY_URL}`)
    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load backtest baseline summary: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw) as BacktestSummaryDto
}

async function fetchBacktestBaselineSnapshot(): Promise<BacktestBaselineSnapshotDto> {
    const resp = await fetch(`${API_BASE_URL}${BACKTEST_BASELINE_SNAPSHOT_URL}`)
    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load backtest baseline snapshot: ${resp.status} ${text}`)
    }

    return (await resp.json()) as BacktestBaselineSnapshotDto
}

export function useBacktestBaselineSummaryReportQuery(): UseQueryResult<BacktestSummaryDto, Error> {
    return useQuery(buildBacktestBaselineSummaryQueryOptions())
}
export function useBacktestBaselineSnapshotQuery(): UseQueryResult<BacktestBaselineSnapshotDto, Error> {
    return useQuery({
        queryKey: BACKTEST_BASELINE_SNAPSHOT_QUERY_KEY,
        queryFn: fetchBacktestBaselineSnapshot,
        retry: false
    })
}

export async function prefetchBacktestBaselineSummaryReport(queryClient: QueryClient): Promise<void> {
    const queryOptions = buildBacktestBaselineSummaryQueryOptions()
    await queryClient.prefetchQuery(queryOptions)
}

export async function prefetchBacktestBaselineSnapshot(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: BACKTEST_BASELINE_SNAPSHOT_QUERY_KEY,
        queryFn: fetchBacktestBaselineSnapshot,
        retry: false
    })
}
