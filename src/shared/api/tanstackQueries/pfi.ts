import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { PfiReportDocumentDto, PfiReportFamilyKeyDto, PfiReportKindDto } from '@/shared/types/pfi.types'
import { mapPfiReportResponse } from '../utils/mapPfiReportResponse'
import { API_ROUTES } from '../routes'
import { API_BASE_URL } from '../../configs/config'
import {
    createSuspenseReportHook,
    prefetchSuspenseReport,
    type SuspenseReportQueryConfig
} from './utils/createSuspenseReportHook'

export type PfiQueryFamily = 'daily' | 'sl'

interface UsePfiReportNavOptions {
    enabled: boolean
}

interface PfiQueryConfig {
    queryKey: readonly string[]
    path: string
    expectedKind: PfiReportKindDto
    expectedFamilyKey: PfiReportFamilyKeyDto
}

const PFI_STALE_TIME_MS = 2 * 60 * 1000
const PFI_GC_TIME_MS = 15 * 60 * 1000

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
        throw new Error(`Failed to load PFI report (${family}): ${resp.status} ${text}`)
    }

    return mapAndValidatePfiReportResponse(family, await resp.json())
}

export const usePfiPerModelReportQuery = createSuspenseReportHook<PfiReportDocumentDto>(getSuspenseReportConfig('daily'))
export const usePfiSlModelReportQuery = createSuspenseReportHook<PfiReportDocumentDto>(getSuspenseReportConfig('sl'))

export function usePfiReportReadQuery(family: PfiQueryFamily): UseQueryResult<PfiReportDocumentDto, Error> {
    const config = PFI_QUERY_CONFIGS[family]

    return useQuery({
        queryKey: config.queryKey,
        queryFn: () => fetchPfiReport(family),
        retry: false,
        staleTime: PFI_STALE_TIME_MS,
        gcTime: PFI_GC_TIME_MS,
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
        staleTime: PFI_STALE_TIME_MS,
        gcTime: PFI_GC_TIME_MS,
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
