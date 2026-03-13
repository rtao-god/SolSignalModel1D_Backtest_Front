import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { BacktestBaselineSnapshotDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../../configs/config'

const BACKTEST_BASELINE_SUMMARY_URL = '/backtest/summary'
const BACKTEST_BASELINE_SUMMARY_STATUS_URL = '/backtest/summary/status'
const BACKTEST_BASELINE_SNAPSHOT_URL = '/backtest/baseline'
const BACKTEST_BASELINE_SNAPSHOT_QUERY_KEY = ['backtest', 'baseline', 'snapshot'] as const
const BACKTEST_BASELINE_SUMMARY_WITH_FRESHNESS_QUERY_KEY = [
    'backtest',
    'summary',
    'baseline',
    'with-freshness'
] as const
const BACKTEST_BASELINE_SUMMARY_STALE_TIME_MS = 2 * 60 * 1000
const BACKTEST_BASELINE_SUMMARY_GC_TIME_MS = 15 * 60 * 1000

export type BacktestSummaryFreshnessState = 'fresh' | 'missing' | 'unknown'
export type BacktestSummarySourceMode = 'actual' | 'debug'

interface BacktestSummaryStatusDto {
    state: BacktestSummaryFreshnessState
    message: string
    backtestSummaryReportId: string | null
    backtestSummaryReportGeneratedAtUtc: string | null
    keyValueSectionCount: number | null
    tableSectionCount: number | null
}

export interface BacktestSummaryFreshnessInfoDto {
    sourceMode: BacktestSummarySourceMode
    state: BacktestSummaryFreshnessState
    message: string | null
    backtestSummaryReportId: string | null
    backtestSummaryReportGeneratedAtUtc: string | null
    keyValueSectionCount: number | null
    tableSectionCount: number | null
}

export interface BacktestSummaryReportWithFreshnessDto {
    report: BacktestSummaryDto
    freshness: BacktestSummaryFreshnessInfoDto
}

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

function toObject(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[backtest-summary] status payload is not an object.')
    }

    return raw as Record<string, unknown>
}

function toState(raw: unknown): BacktestSummaryFreshnessState {
    if (raw === 'fresh' || raw === 'missing' || raw === 'unknown') {
        return raw
    }

    throw new Error(`[backtest-summary] invalid status.state: ${String(raw)}`)
}

function toOptionalString(raw: unknown): string | null {
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
}

function toOptionalInteger(raw: unknown, fieldName: string): number | null {
    if (raw == null) return null
    if (typeof raw !== 'number' || Number.isNaN(raw) || !Number.isFinite(raw) || !Number.isInteger(raw) || raw < 0) {
        throw new Error(`[backtest-summary] status field '${fieldName}' must be a non-negative integer.`)
    }

    return raw
}

function mapBacktestSummaryStatus(raw: unknown): BacktestSummaryStatusDto {
    const payload = toObject(raw)
    const state = toState(payload.state)
    const message =
        typeof payload.message === 'string' && payload.message.trim().length > 0 ?
            payload.message.trim()
        :   `backtest_summary status: ${state}`

    return {
        state,
        message,
        backtestSummaryReportId: toOptionalString(payload.backtestSummaryReportId),
        backtestSummaryReportGeneratedAtUtc: toOptionalString(payload.backtestSummaryReportGeneratedAtUtc),
        keyValueSectionCount: toOptionalInteger(payload.keyValueSectionCount, 'keyValueSectionCount'),
        tableSectionCount: toOptionalInteger(payload.tableSectionCount, 'tableSectionCount')
    }
}

function toFreshnessInfo(status: BacktestSummaryStatusDto | null): BacktestSummaryFreshnessInfoDto {
    if (!status) {
        return {
            sourceMode: 'debug',
            state: 'unknown',
            message: null,
            backtestSummaryReportId: null,
            backtestSummaryReportGeneratedAtUtc: null,
            keyValueSectionCount: null,
            tableSectionCount: null
        }
    }

    return {
        sourceMode: status.state === 'fresh' ? 'actual' : 'debug',
        state: status.state,
        message: status.message,
        backtestSummaryReportId: status.backtestSummaryReportId,
        backtestSummaryReportGeneratedAtUtc: status.backtestSummaryReportGeneratedAtUtc,
        keyValueSectionCount: status.keyValueSectionCount,
        tableSectionCount: status.tableSectionCount
    }
}

async function fetchBacktestSummaryStatusOrNull(): Promise<BacktestSummaryStatusDto | null> {
    const resp = await fetch(`${API_BASE_URL}${BACKTEST_BASELINE_SUMMARY_STATUS_URL}`, { cache: 'no-store' })
    if (!resp.ok) {
        return null
    }

    const raw = await resp.json()
    return mapBacktestSummaryStatus(raw)
}

async function fetchBacktestBaselineSummaryWithFreshness(): Promise<BacktestSummaryReportWithFreshnessDto> {
    let status: BacktestSummaryStatusDto | null = null

    try {
        status = await fetchBacktestSummaryStatusOrNull()
    } catch {
        status = null
    }

    if (status?.state === 'missing') {
        throw new Error(
            '[backtest-summary] Latest backtest_summary report is missing. Regenerate backtest reports first.'
        )
    }

    const report = await fetchBacktestBaselineSummary()
    const freshness = toFreshnessInfo(status)

    if (status?.state === 'fresh' && status.backtestSummaryReportId) {
        const expectedId = status.backtestSummaryReportId.trim()
        const loadedId = report.id.trim()

        if (loadedId.length === 0) {
            throw new Error('[backtest-summary] Loaded report id is empty.')
        }

        if (loadedId !== expectedId) {
            throw new Error(
                `[backtest-summary] Loaded report id (${loadedId}) does not match latest verified id (${expectedId}).`
            )
        }
    }

    return {
        report,
        freshness
    }
}

async function loadBacktestBaselineSummaryWithFreshnessAndCache(
    queryClient: QueryClient
): Promise<BacktestSummaryReportWithFreshnessDto> {
    const payload = await fetchBacktestBaselineSummaryWithFreshness()
    queryClient.setQueryData(['backtest', 'summary', 'baseline'] as const, payload.report)
    queryClient.setQueryData(BACKTEST_BASELINE_SUMMARY_WITH_FRESHNESS_QUERY_KEY, payload)
    return payload
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

export function useBacktestBaselineSummaryReportWithFreshnessQuery(): UseQueryResult<
    BacktestSummaryReportWithFreshnessDto,
    Error
> {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: BACKTEST_BASELINE_SUMMARY_WITH_FRESHNESS_QUERY_KEY,
        queryFn: () => loadBacktestBaselineSummaryWithFreshnessAndCache(queryClient),
        retry: false,
        staleTime: BACKTEST_BASELINE_SUMMARY_STALE_TIME_MS,
        gcTime: BACKTEST_BASELINE_SUMMARY_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
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

export async function prefetchBacktestBaselineSummaryReportWithFreshness(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: BACKTEST_BASELINE_SUMMARY_WITH_FRESHNESS_QUERY_KEY,
        queryFn: () => loadBacktestBaselineSummaryWithFreshnessAndCache(queryClient),
        staleTime: BACKTEST_BASELINE_SUMMARY_STALE_TIME_MS,
        gcTime: BACKTEST_BASELINE_SUMMARY_GC_TIME_MS
    })
}

export async function prefetchBacktestBaselineSnapshot(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: BACKTEST_BASELINE_SNAPSHOT_QUERY_KEY,
        queryFn: fetchBacktestBaselineSnapshot,
        retry: false
    })
}
