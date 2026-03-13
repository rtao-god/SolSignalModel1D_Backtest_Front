import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import type { QueryClient, UseQueryResult } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'

const MODEL_STATS_QUERY_KEY = ['ml', 'stats', 'per-model'] as const
const MODEL_STATS_WITH_FRESHNESS_QUERY_KEY = ['ml', 'stats', 'per-model', 'with-freshness'] as const
const { path } = API_ROUTES.ml.modelStatsPerModel
const { path: statusPath } = API_ROUTES.ml.modelStatsPerModelStatus
const MODEL_STATS_STALE_TIME_MS = 2 * 60 * 1000
const MODEL_STATS_GC_TIME_MS = 15 * 60 * 1000

export type ModelStatsFreshnessState = 'fresh' | 'missing' | 'unknown'
export type ModelStatsSourceMode = 'actual' | 'debug'

interface ModelStatsStatusDto {
    state: ModelStatsFreshnessState
    message: string
    modelStatsReportId: string | null
    modelStatsReportGeneratedAtUtc: string | null
    canonicalSegmentCount: number | null
    keyValueSectionCount: number | null
    tableSectionCount: number | null
}

export interface ModelStatsFreshnessInfoDto {
    sourceMode: ModelStatsSourceMode
    state: ModelStatsFreshnessState
    message: string | null
    modelStatsReportId: string | null
    modelStatsReportGeneratedAtUtc: string | null
    canonicalSegmentCount: number | null
    keyValueSectionCount: number | null
    tableSectionCount: number | null
}

export interface ModelStatsReportWithFreshnessDto {
    report: ReportDocumentDto
    freshness: ModelStatsFreshnessInfoDto
}

export interface ModelStatsReportQueryArgs {
    segment?: string | null
    view?: string | null
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

function buildModelStatsWithFreshnessQueryKey(args?: ModelStatsReportQueryArgs) {
    return [...MODEL_STATS_WITH_FRESHNESS_QUERY_KEY, args?.segment ?? null, args?.view ?? null] as const
}

function toObject(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[model-stats] status payload is not an object.')
    }

    return raw as Record<string, unknown>
}

function toState(raw: unknown): ModelStatsFreshnessState {
    if (raw === 'fresh' || raw === 'missing' || raw === 'unknown') {
        return raw
    }

    throw new Error(`[model-stats] invalid status.state: ${String(raw)}`)
}

function toOptionalString(raw: unknown): string | null {
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
}

function toOptionalInteger(raw: unknown, fieldName: string): number | null {
    if (raw == null) return null
    if (typeof raw !== 'number' || Number.isNaN(raw) || !Number.isFinite(raw) || !Number.isInteger(raw) || raw < 0) {
        throw new Error(`[model-stats] status field '${fieldName}' must be a non-negative integer.`)
    }

    return raw
}

function mapModelStatsStatus(raw: unknown): ModelStatsStatusDto {
    const payload = toObject(raw)
    const state = toState(payload.state)
    const message =
        typeof payload.message === 'string' && payload.message.trim().length > 0 ?
            payload.message.trim()
        :   `backtest_model_stats status: ${state}`

    return {
        state,
        message,
        modelStatsReportId: toOptionalString(payload.modelStatsReportId),
        modelStatsReportGeneratedAtUtc: toOptionalString(payload.modelStatsReportGeneratedAtUtc),
        canonicalSegmentCount: toOptionalInteger(payload.canonicalSegmentCount, 'canonicalSegmentCount'),
        keyValueSectionCount: toOptionalInteger(payload.keyValueSectionCount, 'keyValueSectionCount'),
        tableSectionCount: toOptionalInteger(payload.tableSectionCount, 'tableSectionCount')
    }
}

function toFreshnessInfo(status: ModelStatsStatusDto | null): ModelStatsFreshnessInfoDto {
    if (!status) {
        return {
            sourceMode: 'debug',
            state: 'unknown',
            message: null,
            modelStatsReportId: null,
            modelStatsReportGeneratedAtUtc: null,
            canonicalSegmentCount: null,
            keyValueSectionCount: null,
            tableSectionCount: null
        }
    }

    return {
        sourceMode: status.state === 'fresh' ? 'actual' : 'debug',
        state: status.state,
        message: status.message,
        modelStatsReportId: status.modelStatsReportId,
        modelStatsReportGeneratedAtUtc: status.modelStatsReportGeneratedAtUtc,
        canonicalSegmentCount: status.canonicalSegmentCount,
        keyValueSectionCount: status.keyValueSectionCount,
        tableSectionCount: status.tableSectionCount
    }
}

async function fetchModelStatsReport(args?: ModelStatsReportQueryArgs): Promise<ReportDocumentDto> {
    const reportPath = buildModelStatsReportPath(args)
    const resp = await fetch(`${API_BASE_URL}${reportPath}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load model stats report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

async function fetchModelStatsStatusOrNull(): Promise<ModelStatsStatusDto | null> {
    const resp = await fetch(`${API_BASE_URL}${statusPath}`, { cache: 'no-store' })
    if (!resp.ok) {
        return null
    }

    const raw = await resp.json()
    return mapModelStatsStatus(raw)
}

async function fetchModelStatsReportWithFreshness(
    args?: ModelStatsReportQueryArgs
): Promise<ModelStatsReportWithFreshnessDto> {
    let status: ModelStatsStatusDto | null = null

    try {
        status = await fetchModelStatsStatusOrNull()
    } catch {
        status = null
    }

    if (status?.state === 'missing') {
        throw new Error(
            '[model-stats] Latest backtest_model_stats report is missing. Regenerate model stats reports first.'
        )
    }

    const report = await fetchModelStatsReport(args)
    const freshness = toFreshnessInfo(status)

    if (status?.state === 'fresh' && status.modelStatsReportId) {
        const expectedId = status.modelStatsReportId.trim()
        const loadedId = report.id.trim()

        if (loadedId.length === 0) {
            throw new Error('[model-stats] Loaded report id is empty.')
        }

        if (loadedId !== expectedId) {
            throw new Error(
                `[model-stats] Loaded report id (${loadedId}) does not match latest verified id (${expectedId}).`
            )
        }
    }

    return {
        report,
        freshness
    }
}

async function loadModelStatsReportWithFreshnessAndCache(
    queryClient: QueryClient,
    args?: ModelStatsReportQueryArgs
): Promise<ModelStatsReportWithFreshnessDto> {
    const payload = await fetchModelStatsReportWithFreshness(args)
    queryClient.setQueryData(buildModelStatsQueryKey(args), payload.report)
    queryClient.setQueryData(buildModelStatsWithFreshnessQueryKey(args), payload)
    return payload
}

export function useModelStatsReportQuery(args?: ModelStatsReportQueryArgs): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: buildModelStatsQueryKey(args),
        queryFn: () => fetchModelStatsReport(args),
        retry: false
    })
}

export function useModelStatsReportWithFreshnessQuery(
    args?: ModelStatsReportQueryArgs
): UseQueryResult<ModelStatsReportWithFreshnessDto, Error> {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: buildModelStatsWithFreshnessQueryKey(args),
        queryFn: () => loadModelStatsReportWithFreshnessAndCache(queryClient, args),
        retry: false,
        staleTime: MODEL_STATS_STALE_TIME_MS,
        gcTime: MODEL_STATS_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}

export async function prefetchModelStatsReport(
    queryClient: QueryClient,
    args?: ModelStatsReportQueryArgs
): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: buildModelStatsQueryKey(args),
        queryFn: () => fetchModelStatsReport(args)
    })
}

export async function prefetchModelStatsReportWithFreshness(
    queryClient: QueryClient,
    args?: ModelStatsReportQueryArgs
): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: buildModelStatsWithFreshnessQueryKey(args),
        queryFn: () => loadModelStatsReportWithFreshnessAndCache(queryClient, args),
        staleTime: MODEL_STATS_STALE_TIME_MS,
        gcTime: MODEL_STATS_GC_TIME_MS
    })
}
