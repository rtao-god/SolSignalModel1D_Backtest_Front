import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'

const MODEL_STATS_QUERY_KEY = ['ml', 'stats', 'per-model'] as const

const { path } = API_ROUTES.ml.modelStatsPerModel

/**
 * Suspense-хук для отчёта по статистике моделей:
 * - GET /ml/stats/per-model;
 * - возвращает ReportDocumentDto (kind = "ml_model_stats").
 */
export const useModelStatsReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: MODEL_STATS_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})
