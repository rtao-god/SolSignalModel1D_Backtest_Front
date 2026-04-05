import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { BacktestSummaryDto, BacktestBaselineSnapshotDto } from '@/shared/types/backtest.types'
import type { PolicyEvaluationDto } from '@/shared/types/policyEvaluation.types'
import type { PolicyPerformanceMetricsDto } from '@/shared/types/policyPerformanceMetrics.types'
import { normalizeCurrentPredictionDateUtc } from '@/shared/utils/currentPredictionDate'
import { mapBacktestBaselineSnapshotResponse, mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

export interface CurrentPredictionIndexItemDto {
    id: string
    predictionDateUtc: string
}
export interface CurrentPredictionPublishedCatalogDto {
    set: CurrentPredictionSet
    scope: CurrentPredictionTrainingScope
    publishedAtUtc: string
    totalBuiltReports: number
    earliestBuiltPredictionDateUtc: string
    latestBuiltPredictionDateUtc: string
    missingBuiltWeekdays: number
    expectedBuiltWeekdays: number
    missingBuiltFromDateUtc: string
    missingBuiltToDateUtc: string
    items: CurrentPredictionIndexItemDto[]
}
export interface CurrentPredictionHistoryItemDto {
    id: string
    predictionDateUtc: string
    report: ReportDocumentDto
}
export interface CurrentPredictionBackfilledTrainingScopeStatsDto {
    indicatorWarmupStartDateUtc: string
    fullStartDateUtc: string
    fullEndDateUtc: string
    fullDays: number
    trainStartDateUtc: string
    trainEndDateUtc: string
    trainDays: number
    oosStartDateUtc: string
    oosEndDateUtc: string
    oosDays: number
    recentStartDateUtc: string
    recentEndDateUtc: string
    recentDays: number
    oosHistoryDaySharePercent: number
    recentHistoryDaySharePercent: number
    recentMatchesOos: boolean
    totalDays: number
    trainShare: number
    oosShare: number
    lastTrainDateUtc: string
    firstOosDateUtc: string
    oosPresetCatalog?: CurrentPredictionOosPresetCatalogDto | null
}
export interface CurrentPredictionOosPresetEntryDto {
    key: string
    isFullOos: boolean
    isExtended: boolean
    isDefaultPrimary: boolean
    isDefaultSecondary: boolean
    requestedDaySharePercent: number
    requestedDayShare: number
    targetDayCount: number
    selectedTradeCount: number
    selectedTradeShare: number
    selectedDays: number
    selectedDayShare: number
    daysWithTrades: number
    daysWithoutTrades: number
    startPredictionDateUtc: string
    endPredictionDateUtc: string
}
export interface CurrentPredictionOosPresetCatalogDto {
    publishedAtUtc: string
    historyTotalTrades: number
    historyTotalDays: number
    historyStartDateUtc: string
    historyEndDateUtc: string
    fullOosPresetKey: string
    defaultPrimaryPresetKey: string
    defaultSecondaryPresetKey: string
    entries: CurrentPredictionOosPresetEntryDto[]
}
export interface CurrentPredictionOosPresetAnalysisRowDto {
    key: string
    isFullOos: boolean
    isExtended: boolean
    isDefaultPrimary: boolean
    isDefaultSecondary: boolean
    requestedDaySharePercent: number
    requestedDayShare: number
    targetDayCount: number
    selectedTradeCount: number
    selectedTradeShare: number
    selectedDays: number
    selectedDayShare: number
    trainDays: number
    trainDayShare: number
    daysWithTrades: number
    daysWithoutTrades: number
    startPredictionDateUtc: string
    endPredictionDateUtc: string
    evaluatedDays: number
    correctPredictions: number
    wrongPredictions: number
    accuracyPct: number
    averageConfidencePct: number
    averageActualOutcomeProbabilityPct: number
    averageDecisionMarginPct: number
    bestPolicyName: string | null
    bestPolicyBranch: string | null
    bestPolicyBucket: string | null
    bestPolicyMarginMode: string | null
    bestPolicyMetrics: PolicyPerformanceMetricsDto | null
    bestPolicyEvaluation: PolicyEvaluationDto | null
    balancedScore: number
    conservativeScore: number
    aggressiveScore: number
}
export interface CurrentPredictionOosPresetAnalysisDto {
    mode: string
    publishedAtUtc: string
    oosHistoryDaySharePercent: number
    historyTotalTrades: number
    historyTotalDays: number
    historyStartDateUtc: string
    historyEndDateUtc: string
    balancedRecommendationKey: string | null
    conservativeRecommendationKey: string | null
    aggressiveRecommendationKey: string | null
    rows: CurrentPredictionOosPresetAnalysisRowDto[]
}
/**
 * Published-read metadata для live current prediction.
 * Поле отделяет факт наличия последнего опубликованного снимка от вопроса,
 * совпадает ли он уже с целевым торговым днём.
 */
export interface CurrentPredictionLivePublicationInfoDto {
    /** Целевой торговый день, для которого live sync ожидает актуальную публикацию. */
    targetPredictionDateUtc: string
    /** День прогноза внутри фактически отданного published live-отчёта. */
    publishedPredictionDateUtc: string
    /** Признак, что опубликованный live-снимок уже совпадает с целевым днём. */
    isTargetPredictionDatePublished: boolean
    /** Признак preview-режима для целевого торгового дня на стороне backend. */
    expectedPreview: boolean
}
/**
 * Единый payload live current prediction.
 * Хранит сам опубликованный отчёт, опубликованную дату этого снимка и лёгкую split-статистику.
 */
export interface CurrentPredictionLivePayloadDto {
    report: ReportDocumentDto
    publication?: CurrentPredictionLivePublicationInfoDto | null
    trainingScopeStats?: CurrentPredictionBackfilledTrainingScopeStatsDto | null
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
    trainingScopeStats?: CurrentPredictionBackfilledTrainingScopeStatsDto | null
}
export type CurrentPredictionSet = 'live' | 'backfilled'
export type CurrentPredictionTrainingScope = 'train' | 'full' | 'oos' | 'recent'

export const buildReportEndpoints = (builder: ApiEndpointBuilder) => {
    const { liveReport, datesIndex, byDateReport } = API_ROUTES.currentPrediction

    const { baselineSummaryGet, baselineSnapshotGet, diagnosticsGet } = API_ROUTES.backtest

    return {
        getCurrentPrediction: builder.query<ReportDocumentDto, { scope?: CurrentPredictionTrainingScope } | void>({
            query: args => {
                const params: { scope?: CurrentPredictionTrainingScope } = {}

                if (args?.scope) {
                    params.scope = args.scope
                }

                return {
                    url: liveReport.path,
                    method: liveReport.method,
                    params: Object.keys(params).length > 0 ? params : undefined
                }
            },
            transformResponse: mapReportResponse
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
