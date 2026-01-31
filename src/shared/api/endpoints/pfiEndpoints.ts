import { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

/*
	pfiEndpoints — endpoints API.

	Зачем:
		- Собирает RTK Query endpoints для домена.
*/

/*
	Эндпоинты для PFI-отчётов по моделям.

	- Бэк: GET /api/ml/pfi/per-model → kind = "pfi_per_model".
*/
export const pfiEndpoints = (builder: ApiEndpointBuilder) => {
    const { pfiPerModel } = API_ROUTES.ml

    return {
        getPfiPerModelReport: builder.query<ReportDocumentDto, void>({
            query: () => ({
                url: pfiPerModel.path,
                method: pfiPerModel.method
            }),
            transformResponse: mapReportResponse
        })
    }
}

