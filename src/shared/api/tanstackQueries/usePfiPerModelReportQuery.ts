import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'
const PFI_PER_MODEL_QUERY_KEY = ['ml', 'pfi', 'per-model'] as const
const { path } = API_ROUTES.ml.pfiPerModel

export const usePfiPerModelReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: PFI_PER_MODEL_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})

