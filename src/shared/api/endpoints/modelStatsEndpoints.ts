import { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

/*
	modelStatsEndpoints — endpoints API.

	Зачем:
		- Собирает RTK Query endpoints для домена.
*/

/*
	Эндпоинты для отчётов по статистике моделей.

	- Бэк: GET /api/ml/stats/per-model → kind = "ml_model_stats".
*/
export const modelStatsEndpoints = (builder: ApiEndpointBuilder) => {
    const { modelStatsPerModel } = API_ROUTES.ml

    return {
        getModelStatsReport: builder.query<ReportDocumentDto, void>({
            query: () => ({
                url: modelStatsPerModel.path,
                method: modelStatsPerModel.method
            }),
            transformResponse: mapReportResponse
        })
    }
}

