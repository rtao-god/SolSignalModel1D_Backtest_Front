import { useSuspenseQuery, type UseSuspenseQueryResult } from '@tanstack/react-query'
import type { BacktestBaselineSnapshotDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../config'
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

/**
 * Suspense-версия baseline summary-отчёта бэктеста.
 */
export function useBacktestBaselineSummaryReportQuery(): UseSuspenseQueryResult<BacktestSummaryDto, Error> {
    return useSuspenseQuery({
        queryKey: ['backtest', 'summary', 'baseline'],
        queryFn: fetchBacktestBaselineSummary
    })
}

/**
 * Suspense-версия лёгкого снапшота baseline-бэктеста.
 */
export function useBacktestBaselineSnapshotQuery(): UseSuspenseQueryResult<BacktestBaselineSnapshotDto, Error> {
    return useSuspenseQuery({
        queryKey: ['backtest', 'baseline', 'snapshot'],
        queryFn: fetchBacktestBaselineSnapshot
    })
}
