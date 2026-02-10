import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { BacktestBaselineSnapshotDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'

const { baselineSummaryGet, baselineSnapshotGet } = API_ROUTES.backtest

async function fetchBacktestBaselineSummary(): Promise<BacktestSummaryDto> {
    const resp = await fetch(`${API_BASE_URL}${baselineSummaryGet.path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load backtest baseline summary: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw) as BacktestSummaryDto
}

async function fetchBacktestBaselineSnapshot(): Promise<BacktestBaselineSnapshotDto> {
    const resp = await fetch(`${API_BASE_URL}${baselineSnapshotGet.path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load backtest baseline snapshot: ${resp.status} ${text}`)
    }

    return (await resp.json()) as BacktestBaselineSnapshotDto
}
export function useBacktestBaselineSummaryReportQuery(): UseQueryResult<BacktestSummaryDto, Error> {
    return useQuery({
        queryKey: ['backtest', 'summary', 'baseline'],
        queryFn: fetchBacktestBaselineSummary,
        retry: false
    })
}
export function useBacktestBaselineSnapshotQuery(): UseQueryResult<BacktestBaselineSnapshotDto, Error> {
    return useQuery({
        queryKey: ['backtest', 'baseline', 'snapshot'],
        queryFn: fetchBacktestBaselineSnapshot,
        retry: false
    })
}

