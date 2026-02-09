import { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

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

