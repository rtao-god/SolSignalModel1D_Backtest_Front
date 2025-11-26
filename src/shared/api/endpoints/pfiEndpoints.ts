import { ReportDocumentDto } from "@/shared/types/report.types";
import { mapReportResponse } from "../utils/mapReportResponse";
import { ApiEndpointBuilder } from "../types";

export const pfiEndpoints = (builder: ApiEndpointBuilder) => ({
    getPfiPerModelReport: builder.query<ReportDocumentDto, void>({
        query: () => ({
            url: '/ml/pfi/per-model',
            method: 'GET'
        }),
        transformResponse: mapReportResponse
    })
})