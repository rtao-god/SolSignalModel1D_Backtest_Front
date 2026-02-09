import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { API_BASE_URL } from '../../configs/config'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'
const PFI_PER_MODEL_QUERY_KEY = ['ml', 'pfi', 'per-model'] as const
const { path } = API_ROUTES.ml.pfiPerModel

export const usePfiPerModelReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: PFI_PER_MODEL_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})

interface UsePfiPerModelNavOptions {
    enabled: boolean
}

async function fetchPfiPerModelReport(): Promise<ReportDocumentDto> {
    const resp = await fetch(`${API_BASE_URL}${path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load PFI report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

export function usePfiPerModelReportNavQuery(
    options: UsePfiPerModelNavOptions
): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: PFI_PER_MODEL_QUERY_KEY,
        queryFn: fetchPfiPerModelReport,
        enabled: options.enabled
    })
}

