import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { BacktestSummaryDto, BacktestBaselineSnapshotDto } from '@/shared/types/backtest.types'
import { normalizeCurrentPredictionDateUtc } from '@/shared/utils/currentPredictionDate'
import { mapBacktestBaselineSnapshotResponse, mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

export interface CurrentPredictionIndexItemDto {
    id: string
    predictionDateUtc: string
}
export interface CurrentPredictionHistoryPageItemDto {
    id: string
    predictionDateUtc: string
    report: ReportDocumentDto
}
export interface CurrentPredictionHistoryPageDto {
    page: number
    pageSize: number
    totalPages: number
    totalBuiltReports: number
    filteredReports: number
    hasPrevPage: boolean
    hasNextPage: boolean
    earliestBuiltPredictionDateUtc: string
    latestBuiltPredictionDateUtc: string
    missingBuiltWeekdays: number
    expectedBuiltWeekdays: number
    missingBuiltFromDateUtc: string
    missingBuiltToDateUtc: string
    items: CurrentPredictionHistoryPageItemDto[]
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
        getCurrentPrediction: builder.query<
            CurrentPredictionLatestDto,
            { scope?: CurrentPredictionTrainingScope } | void
        >({
            query: args => {
                const params: { scope?: CurrentPredictionTrainingScope } = {}

                if (args?.scope) {
                    params.scope = args.scope
                }

                return {
                    url: latestReport.path,
                    method: latestReport.method,
                    params: Object.keys(params).length > 0 ? params : undefined
                }
            },
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
            { set: CurrentPredictionSet; days?: number; scope?: CurrentPredictionTrainingScope }
        >({
            query: ({ set, days, scope }) => {
                const params: {
                    set: CurrentPredictionSet
                    days?: number
                    scope?: CurrentPredictionTrainingScope
                } = { set }
                if (typeof days === 'number' && Number.isFinite(days) && days > 0) {
                    params.days = days
                }
                if (scope) {
                    params.scope = scope
                }

                return {
                    url: datesIndex.path,
                    method: datesIndex.method,
                    params
                }
            },
            transformResponse: raw => {
                const payload = raw as Array<{ id?: unknown; predictionDateUtc?: unknown }>
                if (!Array.isArray(payload)) {
                    throw new Error('[current-prediction] index payload must be an array.')
                }

                return payload.map((item, index) => {
                    if (typeof item?.id !== 'string' || !item.id.trim()) {
                        throw new Error(`[current-prediction] index item id is invalid at index=${index}.`)
                    }
                    if (typeof item?.predictionDateUtc !== 'string') {
                        throw new Error(
                            `[current-prediction] index item predictionDateUtc is invalid at index=${index}.`
                        )
                    }

                    return {
                        id: item.id,
                        predictionDateUtc: normalizeCurrentPredictionDateUtc(item.predictionDateUtc)
                    }
                })
            }
        }),
        getCurrentPredictionByDate: builder.query<
            ReportDocumentDto,
            {
                set: CurrentPredictionSet
                dateUtc: string
                scope?: CurrentPredictionTrainingScope
            }
        >({
            query: ({ set, dateUtc, scope }) => {
                const normalizedDateUtc = normalizeCurrentPredictionDateUtc(dateUtc)
                const params: {
                    set: CurrentPredictionSet
                    dateUtc: string
                    scope?: CurrentPredictionTrainingScope
                } = { set, dateUtc: normalizedDateUtc }

                if (scope) {
                    params.scope = scope
                }

                return {
                    url: byDateReport.path,
                    method: byDateReport.method,
                    params
                }
            },
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
            }),
            transformResponse: mapBacktestBaselineSnapshotResponse
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
