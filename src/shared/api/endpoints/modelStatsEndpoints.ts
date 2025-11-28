import { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'

/**
 * Эндпоинты для отчётов по статистике моделей.
 * Бэк: GET /api/ml/stats/per-model → kind = "ml_model_stats".
 */
export const modelStatsEndpoints = (builder: ApiEndpointBuilder) => ({
    getModelStatsReport: builder.query<ReportDocumentDto, void>({
        query: () => ({
            url: '/ml/stats/per-model',
            method: 'GET'
        }),
        transformResponse: mapReportResponse
    })
})
