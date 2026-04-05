import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import type {
    PfiFeatureDetailReportDto,
    PfiFeatureDetailScoreScopeKeyDto,
    PfiFeatureHistoryRangeKeyDto,
    PfiReportDocumentDto,
    PfiReportFamilyKeyDto,
    PfiReportKindDto
} from '@/shared/types/pfi.types'
import { QUERY_POLICY_REGISTRY } from '@/shared/configs/queryPolicies'
import { mapPfiReportResponse } from '../utils/mapPfiReportResponse'
import { mapPfiFeatureDetailReportResponse } from '../utils/mapPfiFeatureDetailReportResponse'
import { API_ROUTES } from '../routes'
import { API_BASE_URL } from '../../configs/config'
import {
    createSuspenseReportHook,
    prefetchSuspenseReport,
    type SuspenseReportQueryConfig
} from './utils/createSuspenseReportHook'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

export type PfiQueryFamily = 'daily' | 'sl'

interface UsePfiReportNavOptions {
    enabled: boolean
}

interface UsePfiFeatureDetailOptions {
    enabled?: boolean
}

interface PfiQueryConfig {
    queryKey: readonly string[]
    path: string
    expectedKind: PfiReportKindDto
    expectedFamilyKey: PfiReportFamilyKeyDto
}

const PFI_QUERY_CONFIGS: Record<PfiQueryFamily, PfiQueryConfig> = {
    daily: {
        queryKey: ['ml', 'pfi', 'per-model'],
        path: API_ROUTES.ml.pfiPerModel.path,
        expectedKind: 'pfi_per_model',
        expectedFamilyKey: 'daily_model'
    },
    sl: {
        queryKey: ['ml', 'pfi', 'sl-model'],
        path: API_ROUTES.ml.pfiSlModel.path,
        expectedKind: 'pfi_sl_model',
        expectedFamilyKey: 'sl_model'
    }
}

function mapAndValidatePfiReportResponse(family: PfiQueryFamily, raw: unknown): PfiReportDocumentDto {
    const report = mapPfiReportResponse(raw)
    const expected = PFI_QUERY_CONFIGS[family]

    if (report.kind !== expected.expectedKind) {
        throw new Error(
            `[ui:pfi] report kind mismatch for family=${family}. expected=${expected.expectedKind}, actual=${report.kind}.`
        )
    }

    if (report.familyKey !== expected.expectedFamilyKey) {
        throw new Error(
            `[ui:pfi] report family mismatch for family=${family}. expected=${expected.expectedFamilyKey}, actual=${report.familyKey}.`
        )
    }

    return report
}

function mapAndValidatePfiFeatureDetailResponse(raw: unknown): PfiFeatureDetailReportDto {
    const report = mapPfiFeatureDetailReportResponse(raw)

    if (report.kind !== 'pfi_per_model_feature_detail') {
        throw new Error(
            `[ui:pfi] feature detail report kind mismatch. expected=pfi_per_model_feature_detail, actual=${report.kind}.`
        )
    }

    if (report.familyKey !== 'daily_model') {
        throw new Error(
            `[ui:pfi] feature detail report family mismatch. expected=daily_model, actual=${report.familyKey}.`
        )
    }

    return report
}

function getSuspenseReportConfig(family: PfiQueryFamily): SuspenseReportQueryConfig<PfiReportDocumentDto> {
    const config = PFI_QUERY_CONFIGS[family]

    return {
        queryKey: config.queryKey,
        path: config.path,
        mapResponse: raw => mapAndValidatePfiReportResponse(family, raw)
    }
}

async function fetchPfiReport(family: PfiQueryFamily): Promise<PfiReportDocumentDto> {
    const config = PFI_QUERY_CONFIGS[family]
    const resp = await fetch(`${API_BASE_URL}${config.path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage(`Failed to load PFI report (${family})`, resp, text))
    }

    return mapAndValidatePfiReportResponse(family, await resp.json())
}

async function fetchPfiFeatureDetailReport(
    featureId: string,
    scoreScopeKey: PfiFeatureDetailScoreScopeKeyDto,
    historyRangeKey: PfiFeatureHistoryRangeKeyDto
): Promise<PfiFeatureDetailReportDto> {
    if (!featureId || featureId.trim().length === 0) {
        throw new Error('[ui:pfi] featureId is required to load PFI feature detail report.')
    }

    const encodedFeatureId = encodeURIComponent(featureId.trim())
    const query = new URLSearchParams({
        scoreScope: scoreScopeKey,
        historyRange: historyRangeKey
    })
    const resp = await fetch(
        `${API_BASE_URL}${API_ROUTES.ml.pfiPerModelFeatureDetail.path}/${encodedFeatureId}?${query.toString()}`
    )

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(
            buildDetailedRequestErrorMessage(
                `Failed to load PFI feature report (${featureId}, scope=${scoreScopeKey}, range=${historyRangeKey})`,
                resp,
                text
            )
        )
    }

    const report = mapAndValidatePfiFeatureDetailResponse(await resp.json())
    if (report.featureName !== featureId.trim()) {
        throw new Error(
            `[ui:pfi] feature detail report name mismatch. expected=${featureId.trim()}, actual=${report.featureName}.`
        )
    }
    if (report.scoreScopeKey !== scoreScopeKey) {
        throw new Error(
            `[ui:pfi] feature detail report score scope mismatch. expected=${scoreScopeKey}, actual=${report.scoreScopeKey}.`
        )
    }
    if (report.historyRangeKey !== historyRangeKey) {
        throw new Error(
            `[ui:pfi] feature detail report history range mismatch. expected=${historyRangeKey}, actual=${report.historyRangeKey}.`
        )
    }

    return report
}

export const usePfiPerModelReportQuery = createSuspenseReportHook<PfiReportDocumentDto>(getSuspenseReportConfig('daily'))
export const usePfiSlModelReportQuery = createSuspenseReportHook<PfiReportDocumentDto>(getSuspenseReportConfig('sl'))

export function usePfiReportReadQuery(family: PfiQueryFamily): UseQueryResult<PfiReportDocumentDto, Error> {
    const config = PFI_QUERY_CONFIGS[family]

    return useQuery({
        queryKey: config.queryKey,
        queryFn: () => fetchPfiReport(family),
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.pfi.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.pfi.gcTimeMs,
        refetchOnWindowFocus: false
    })
}

export function usePfiFeatureDetailReportQuery(
    featureId: string,
    scoreScopeKey: PfiFeatureDetailScoreScopeKeyDto,
    historyRangeKey: PfiFeatureHistoryRangeKeyDto,
    options?: UsePfiFeatureDetailOptions
): UseQueryResult<PfiFeatureDetailReportDto, Error> {
    const normalized = featureId.trim()

    return useQuery({
        queryKey: ['ml', 'pfi', 'per-model', 'feature', normalized, scoreScopeKey, historyRangeKey],
        queryFn: () => fetchPfiFeatureDetailReport(normalized, scoreScopeKey, historyRangeKey),
        enabled: options?.enabled ?? normalized.length > 0,
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.pfi.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.pfi.gcTimeMs,
        refetchOnWindowFocus: false
    })
}

export function usePfiPerModelReportReadQuery(): UseQueryResult<PfiReportDocumentDto, Error> {
    return usePfiReportReadQuery('daily')
}

export function usePfiSlModelReportReadQuery(): UseQueryResult<PfiReportDocumentDto, Error> {
    return usePfiReportReadQuery('sl')
}

export function usePfiReportNavQuery(
    family: PfiQueryFamily,
    options: UsePfiReportNavOptions
): UseQueryResult<PfiReportDocumentDto, Error> {
    const queryClient = useQueryClient()
    const config = PFI_QUERY_CONFIGS[family]

    return useQuery({
        queryKey: config.queryKey,
        queryFn: () => fetchPfiReport(family),
        initialData: () => queryClient.getQueryData<PfiReportDocumentDto>(config.queryKey),
        enabled: options.enabled,
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.pfi.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.pfi.gcTimeMs,
        refetchOnWindowFocus: false
    })
}

export function usePfiPerModelReportNavQuery(
    options: UsePfiReportNavOptions
): UseQueryResult<PfiReportDocumentDto, Error> {
    return usePfiReportNavQuery('daily', options)
}

export function usePfiSlModelReportNavQuery(
    options: UsePfiReportNavOptions
): UseQueryResult<PfiReportDocumentDto, Error> {
    return usePfiReportNavQuery('sl', options)
}

export async function prefetchPfiReport(queryClient: QueryClient, family: PfiQueryFamily): Promise<void> {
    await prefetchSuspenseReport(queryClient, getSuspenseReportConfig(family))
}

export async function prefetchPfiPerModelReport(queryClient: QueryClient): Promise<void> {
    await prefetchPfiReport(queryClient, 'daily')
}

export async function prefetchPfiSlModelReport(queryClient: QueryClient): Promise<void> {
    await prefetchPfiReport(queryClient, 'sl')
}
