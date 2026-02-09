import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { BacktestSummaryDto, BacktestBaselineSnapshotDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

export interface CurrentPredictionIndexItemDto {
    id: string
    predictionDateUtc: string
}
export type CurrentPredictionSet = 'live' | 'backfilled'
export type CurrentPredictionTrainingScope = 'train' | 'full' | 'oos' | 'recent'

export interface CurrentPredictionLatestDto {
    live: ReportDocumentDto | null
    backfilled: ReportDocumentDto | null
}

export const buildReportEndpoints = (builder: ApiEndpointBuilder) => {
    const { latestReport, datesIndex, byDateReport } = API_ROUTES.currentPrediction

    const { baselineSummaryGet, baselineSnapshotGet, diagnosticsGet } = API_ROUTES.backtest

    return {
        getCurrentPrediction: builder.query<CurrentPredictionLatestDto, void>({
            query: () => ({
                url: latestReport.path,
                method: latestReport.method
            }),
            transformResponse: raw => {
                const payload = raw as { live?: unknown; backfilled?: unknown }

                return {
                    live: payload.live ? mapReportResponse(payload.live) : null,
                    backfilled: payload.backfilled ? mapReportResponse(payload.backfilled) : null
                }
            }
        }),
        getCurrentPredictionIndex: builder.query<
            CurrentPredictionIndexItemDto[],
            { set: CurrentPredictionSet; days?: number }
        >({
            query: ({ set, days }) => {
                const params = days ? { set, days } : { set }

                return {
                    url: datesIndex.path,
                    method: datesIndex.method,
                    params
                }
            }
        }),
        getCurrentPredictionByDate: builder.query<ReportDocumentDto, { set: CurrentPredictionSet; dateUtc: string }>({
            query: ({ set, dateUtc }) => ({
                url: byDateReport.path,
                method: byDateReport.method,
                params: { set, dateUtc }
            }),
            transformResponse: mapReportResponse
        }),
        getBacktestBaselineSummary: builder.query<BacktestSummaryDto, void>({
            query: () => ({
                url: baselineSummaryGet.path,
                method: baselineSummaryGet.method
            }),
            transformResponse: mapReportResponse
        }),
        getBacktestBaselineSnapshot: builder.query<BacktestBaselineSnapshotDto, void>({
            query: () => ({
                url: baselineSnapshotGet.path,
                method: baselineSnapshotGet.method
            })
        }),
        getBacktestDiagnosticsReport: builder.query<ReportDocumentDto, void>({
            query: () => ({
                url: diagnosticsGet.path,
                method: diagnosticsGet.method
            }),
            transformResponse: mapReportResponse
        })
    }
}

