import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { API_BASE_URL } from '../../configs/config'
import {
    createSuspenseReportHook,
    prefetchSuspenseReport,
    type SuspenseReportQueryConfig
} from './utils/createSuspenseReportHook'

const PFI_PER_MODEL_QUERY_KEY = ['ml', 'pfi', 'per-model'] as const
const PFI_PER_MODEL_WITH_FRESHNESS_QUERY_KEY = ['ml', 'pfi', 'per-model', 'with-freshness'] as const
const { path } = API_ROUTES.ml.pfiPerModel
const { path: statusPath } = API_ROUTES.ml.pfiPerModelStatus

const PFI_PER_MODEL_REPORT_CONFIG: SuspenseReportQueryConfig<ReportDocumentDto> = {
    queryKey: PFI_PER_MODEL_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
}

const PFI_PER_MODEL_STALE_TIME_MS = 2 * 60 * 1000
const PFI_PER_MODEL_GC_TIME_MS = 15 * 60 * 1000

export const usePfiPerModelReportQuery = createSuspenseReportHook<ReportDocumentDto>(PFI_PER_MODEL_REPORT_CONFIG)

interface UsePfiPerModelNavOptions {
    enabled: boolean
}

interface UsePfiPerModelWithFreshnessOptions {
    enabled?: boolean
}

export type PfiPerModelFreshnessState = 'fresh' | 'missing' | 'unknown'
export type PfiPerModelSourceMode = 'actual' | 'debug'

interface PfiPerModelStatusDto {
    state: PfiPerModelFreshnessState
    message: string
    pfiReportId: string | null
    pfiReportGeneratedAtUtc: string | null
    canonicalSnapshotCount: number | null
    tableSectionCount: number | null
}

export interface PfiPerModelFreshnessInfoDto {
    sourceMode: PfiPerModelSourceMode
    state: PfiPerModelFreshnessState
    message: string | null
    pfiReportId: string | null
    pfiReportGeneratedAtUtc: string | null
    canonicalSnapshotCount: number | null
    tableSectionCount: number | null
}

export interface PfiPerModelReportWithFreshnessDto {
    report: ReportDocumentDto
    freshness: PfiPerModelFreshnessInfoDto
}

function buildPfiPerModelWithFreshnessQueryKey() {
    return PFI_PER_MODEL_WITH_FRESHNESS_QUERY_KEY
}

function toObjectOrThrow(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[pfi] status payload is not an object.')
    }

    return raw as Record<string, unknown>
}

function toStateOrThrow(raw: unknown): PfiPerModelFreshnessState {
    if (raw === 'fresh' || raw === 'missing' || raw === 'unknown') {
        return raw
    }

    throw new Error(`[pfi] invalid status.state: ${String(raw)}`)
}

function toOptionalString(raw: unknown): string | null {
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
}

function toOptionalInteger(raw: unknown, fieldName: string): number | null {
    if (raw == null) return null
    if (typeof raw !== 'number' || Number.isNaN(raw) || !Number.isFinite(raw) || !Number.isInteger(raw) || raw < 0) {
        throw new Error(`[pfi] status field '${fieldName}' must be a non-negative integer.`)
    }

    return raw
}

function mapPfiPerModelStatus(raw: unknown): PfiPerModelStatusDto {
    const payload = toObjectOrThrow(raw)
    const state = toStateOrThrow(payload.state)
    const message =
        typeof payload.message === 'string' && payload.message.trim().length > 0 ?
            payload.message.trim()
        :   `pfi_per_model status: ${state}`

    return {
        state,
        message,
        pfiReportId: toOptionalString(payload.pfiReportId),
        pfiReportGeneratedAtUtc: toOptionalString(payload.pfiReportGeneratedAtUtc),
        canonicalSnapshotCount: toOptionalInteger(payload.canonicalSnapshotCount, 'canonicalSnapshotCount'),
        tableSectionCount: toOptionalInteger(payload.tableSectionCount, 'tableSectionCount')
    }
}

function toFreshnessInfo(status: PfiPerModelStatusDto | null): PfiPerModelFreshnessInfoDto {
    if (!status) {
        return {
            sourceMode: 'debug',
            state: 'unknown',
            message: null,
            pfiReportId: null,
            pfiReportGeneratedAtUtc: null,
            canonicalSnapshotCount: null,
            tableSectionCount: null
        }
    }

    return {
        sourceMode: status.state === 'fresh' ? 'actual' : 'debug',
        state: status.state,
        message: status.message,
        pfiReportId: status.pfiReportId,
        pfiReportGeneratedAtUtc: status.pfiReportGeneratedAtUtc,
        canonicalSnapshotCount: status.canonicalSnapshotCount,
        tableSectionCount: status.tableSectionCount
    }
}

async function fetchPfiPerModelStatusOrNull(): Promise<PfiPerModelStatusDto | null> {
    const resp = await fetch(`${API_BASE_URL}${statusPath}`, { cache: 'no-store' })
    if (!resp.ok) {
        return null
    }

    const raw = await resp.json()
    return mapPfiPerModelStatus(raw)
}

async function fetchPfiPerModelReport(): Promise<ReportDocumentDto> {
    const resp = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load PFI report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

async function fetchPfiPerModelReportWithFreshness(): Promise<PfiPerModelReportWithFreshnessDto> {
    let status: PfiPerModelStatusDto | null = null

    try {
        status = await fetchPfiPerModelStatusOrNull()
    } catch {
        status = null
    }

    if (status?.state === 'missing') {
        throw new Error('[pfi] Latest pfi_per_model report is missing. Regenerate PFI reports first.')
    }

    const report = await fetchPfiPerModelReport()
    const freshness = toFreshnessInfo(status)

    if (status?.state === 'fresh' && status.pfiReportId) {
        const expectedId = status.pfiReportId.trim()
        const loadedId = report.id.trim()

        if (loadedId.length === 0) {
            throw new Error('[pfi] Loaded report id is empty.')
        }

        if (loadedId !== expectedId) {
            throw new Error(`[pfi] Loaded report id (${loadedId}) does not match latest verified id (${expectedId}).`)
        }
    }

    return {
        report,
        freshness
    }
}

async function loadPfiPerModelReportWithFreshnessAndCache(
    queryClient: QueryClient
): Promise<PfiPerModelReportWithFreshnessDto> {
    const payload = await fetchPfiPerModelReportWithFreshness()
    queryClient.setQueryData(PFI_PER_MODEL_QUERY_KEY, payload.report)
    queryClient.setQueryData(buildPfiPerModelWithFreshnessQueryKey(), payload)
    return payload
}

export function usePfiPerModelReportWithFreshnessQuery(
    options?: UsePfiPerModelWithFreshnessOptions
): UseQueryResult<PfiPerModelReportWithFreshnessDto, Error> {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: buildPfiPerModelWithFreshnessQueryKey(),
        queryFn: () => loadPfiPerModelReportWithFreshnessAndCache(queryClient),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: PFI_PER_MODEL_STALE_TIME_MS,
        gcTime: PFI_PER_MODEL_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}

export function usePfiPerModelReportNavQuery(
    options: UsePfiPerModelNavOptions
): UseQueryResult<ReportDocumentDto, Error> {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: PFI_PER_MODEL_QUERY_KEY,
        queryFn: async () => {
            const cachedPayload = queryClient.getQueryData<PfiPerModelReportWithFreshnessDto>(
                buildPfiPerModelWithFreshnessQueryKey()
            )
            if (cachedPayload?.report) {
                return cachedPayload.report
            }

            return fetchPfiPerModelReport()
        },
        initialData: () => {
            const cachedPayload = queryClient.getQueryData<PfiPerModelReportWithFreshnessDto>(
                buildPfiPerModelWithFreshnessQueryKey()
            )
            return cachedPayload?.report
        },
        enabled: options.enabled,
        retry: false,
        staleTime: PFI_PER_MODEL_STALE_TIME_MS,
        gcTime: PFI_PER_MODEL_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}

export async function prefetchPfiPerModelReport(queryClient: QueryClient): Promise<void> {
    await prefetchSuspenseReport(queryClient, PFI_PER_MODEL_REPORT_CONFIG)
}

export async function prefetchPfiPerModelReportWithFreshness(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: buildPfiPerModelWithFreshnessQueryKey(),
        queryFn: () => loadPfiPerModelReportWithFreshnessAndCache(queryClient),
        staleTime: PFI_PER_MODEL_STALE_TIME_MS,
        gcTime: PFI_PER_MODEL_GC_TIME_MS
    })
}
