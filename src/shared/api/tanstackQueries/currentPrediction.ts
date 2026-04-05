import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type {
    CurrentPredictionBackfilledTrainingScopeStatsDto,
    CurrentPredictionHistoryItemDto,
    CurrentPredictionHistoryPageDto,
    CurrentPredictionIndexItemDto,
    CurrentPredictionLivePublicationInfoDto,
    CurrentPredictionLivePayloadDto,
    CurrentPredictionOosPresetAnalysisDto,
    CurrentPredictionOosPresetAnalysisRowDto,
    CurrentPredictionOosPresetCatalogDto,
    CurrentPredictionOosPresetEntryDto,
    CurrentPredictionSet,
    CurrentPredictionTrainingScope
} from '../endpoints/reportEndpoints'
import type { PolicyEvaluationDto } from '@/shared/types/policyEvaluation.types'
import { normalizeCurrentPredictionDateUtc } from '@/shared/utils/currentPredictionDate'
import { mapReportResponse } from '../utils/mapReportResponse'
import { mapPolicyPerformanceMetricsOrNull } from '../utils/mapPolicyPerformanceMetrics'
import { API_BASE_URL } from '../../configs/config'
import { QUERY_POLICY_REGISTRY } from '@/shared/configs/queryPolicies'
import { API_ROUTES } from '../routes'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

const { livePayload, datesIndex, historyPage, oosPresetAnalysis } = API_ROUTES.currentPrediction

export const DEFAULT_BACKFILLED_HISTORY_SCOPE: CurrentPredictionTrainingScope = 'full'
export type CurrentPredictionBackfilledTrainingScopeStats = CurrentPredictionBackfilledTrainingScopeStatsDto
export type CurrentPredictionOosPresetEntry = CurrentPredictionOosPresetEntryDto
export type CurrentPredictionOosPresetCatalog = CurrentPredictionOosPresetCatalogDto
export type CurrentPredictionOosPresetAnalysis = CurrentPredictionOosPresetAnalysisDto
export type CurrentPredictionOosPresetAnalysisRow = CurrentPredictionOosPresetAnalysisRowDto
export type CurrentPredictionOosPresetAnalysisMode = 'base' | 'extended'

interface CurrentPredictionIndexQueryOptions {
    enabled?: boolean
}

interface CurrentPredictionQueryOptions {
    enabled?: boolean
}

interface CurrentPredictionTrainingScopeStatsQueryOptions {
    enabled?: boolean
}

export interface CurrentPredictionHistoryPageQueryArgs {
    set: CurrentPredictionSet
    scope: CurrentPredictionTrainingScope
    page: number
    pageSize: number
    days?: number
    fromDateUtc?: string
    toDateUtc?: string
    oosPresetKey?: string
}

function resolveCurrentPredictionIndexScope(
    set: CurrentPredictionSet,
    scope?: CurrentPredictionTrainingScope
): CurrentPredictionTrainingScope {
    if (!scope) {
        throw new Error(`[current-prediction] History index scope is required. set=${set}.`)
    }

    return scope
}

function readRequiredFiniteNumber(raw: unknown, fieldName: string): number {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        throw new Error(`[current-prediction] field '${fieldName}' must be a finite number.`)
    }

    return raw
}

function readRequiredBoolean(raw: unknown, fieldName: string): boolean {
    if (typeof raw !== 'boolean') {
        throw new Error(`[current-prediction] field '${fieldName}' must be a boolean.`)
    }

    return raw
}

function readRequiredString(raw: unknown, fieldName: string): string {
    if (typeof raw !== 'string' || !raw.trim()) {
        throw new Error(`[current-prediction] field '${fieldName}' must be a non-empty string.`)
    }

    return raw
}

function readRequiredDateString(raw: unknown, fieldName: string): string {
    return normalizeCurrentPredictionDateUtc(readRequiredString(raw, fieldName))
}

function readOptionalFiniteNumber(raw: unknown, fieldName: string): number | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    return readRequiredFiniteNumber(raw, fieldName)
}

function readOptionalBoolean(raw: unknown, fieldName: string): boolean | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    return readRequiredBoolean(raw, fieldName)
}

function readOptionalTrimmedString(raw: unknown, fieldName: string): string | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (typeof raw !== 'string') {
        throw new Error(`[current-prediction] field '${fieldName}' must be a string when present.`)
    }

    const normalized = raw.trim()
    return normalized ? normalized : null
}

function mapCurrentPredictionOosPresetEntry(raw: unknown, fieldName: string): CurrentPredictionOosPresetEntryDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] ${fieldName} must be an object.`)
    }

    const entry = raw as Record<string, unknown>

    return {
        key: readRequiredString(entry.key, `${fieldName}.key`),
        isFullOos: readRequiredBoolean(entry.isFullOos, `${fieldName}.isFullOos`),
        isExtended: readRequiredBoolean(entry.isExtended, `${fieldName}.isExtended`),
        isDefaultPrimary: readRequiredBoolean(entry.isDefaultPrimary, `${fieldName}.isDefaultPrimary`),
        isDefaultSecondary: readRequiredBoolean(entry.isDefaultSecondary, `${fieldName}.isDefaultSecondary`),
        requestedDaySharePercent: readRequiredFiniteNumber(
            entry.requestedDaySharePercent,
            `${fieldName}.requestedDaySharePercent`
        ),
        requestedDayShare: readRequiredFiniteNumber(entry.requestedDayShare, `${fieldName}.requestedDayShare`),
        targetDayCount: readRequiredFiniteNumber(entry.targetDayCount, `${fieldName}.targetDayCount`),
        selectedTradeCount: readRequiredFiniteNumber(entry.selectedTradeCount, `${fieldName}.selectedTradeCount`),
        selectedTradeShare: readRequiredFiniteNumber(entry.selectedTradeShare, `${fieldName}.selectedTradeShare`),
        selectedDays: readRequiredFiniteNumber(entry.selectedDays, `${fieldName}.selectedDays`),
        selectedDayShare: readRequiredFiniteNumber(entry.selectedDayShare, `${fieldName}.selectedDayShare`),
        daysWithTrades: readRequiredFiniteNumber(entry.daysWithTrades, `${fieldName}.daysWithTrades`),
        daysWithoutTrades: readRequiredFiniteNumber(entry.daysWithoutTrades, `${fieldName}.daysWithoutTrades`),
        startPredictionDateUtc: readRequiredDateString(
            entry.startPredictionDateUtc,
            `${fieldName}.startPredictionDateUtc`
        ),
        endPredictionDateUtc: readRequiredDateString(entry.endPredictionDateUtc, `${fieldName}.endPredictionDateUtc`)
    }
}

function mapCurrentPredictionOosPresetCatalog(raw: unknown): CurrentPredictionOosPresetCatalogDto | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] oosPresetCatalog payload must be an object.')
    }

    const catalog = raw as Record<string, unknown>
    if (!Array.isArray(catalog.entries)) {
        throw new Error('[current-prediction] oosPresetCatalog.entries must be an array.')
    }

    return {
        publishedAtUtc: readRequiredString(catalog.publishedAtUtc, 'oosPresetCatalog.publishedAtUtc'),
        historyTotalTrades: readRequiredFiniteNumber(catalog.historyTotalTrades, 'oosPresetCatalog.historyTotalTrades'),
        historyTotalDays: readRequiredFiniteNumber(catalog.historyTotalDays, 'oosPresetCatalog.historyTotalDays'),
        historyStartDateUtc: readRequiredDateString(catalog.historyStartDateUtc, 'oosPresetCatalog.historyStartDateUtc'),
        historyEndDateUtc: readRequiredDateString(catalog.historyEndDateUtc, 'oosPresetCatalog.historyEndDateUtc'),
        fullOosPresetKey: readRequiredString(catalog.fullOosPresetKey, 'oosPresetCatalog.fullOosPresetKey'),
        defaultPrimaryPresetKey: readRequiredString(
            catalog.defaultPrimaryPresetKey,
            'oosPresetCatalog.defaultPrimaryPresetKey'
        ),
        defaultSecondaryPresetKey: readRequiredString(
            catalog.defaultSecondaryPresetKey,
            'oosPresetCatalog.defaultSecondaryPresetKey'
        ),
        entries: catalog.entries.map((item, index) =>
            mapCurrentPredictionOosPresetEntry(item, `oosPresetCatalog.entries[${index}]`)
        )
    }
}

function mapPolicyEvaluationReasonResponse(raw: unknown, fieldName: string) {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] ${fieldName} must be an object.`)
    }

    const payload = raw as Record<string, unknown>
    return {
        code: readRequiredString(payload.code, `${fieldName}.code`),
        message: readRequiredString(payload.message, `${fieldName}.message`)
    }
}

function mapPolicyEvaluationThresholdsResponse(raw: unknown, fieldName: string) {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] ${fieldName} must be an object.`)
    }

    const payload = raw as Record<string, unknown>
    return {
        maxDrawdownPct: readRequiredFiniteNumber(payload.maxDrawdownPct, `${fieldName}.maxDrawdownPct`),
        minTradesCount: readRequiredFiniteNumber(payload.minTradesCount, `${fieldName}.minTradesCount`),
        minCalmar: readRequiredFiniteNumber(payload.minCalmar, `${fieldName}.minCalmar`),
        minSortino: readRequiredFiniteNumber(payload.minSortino, `${fieldName}.minSortino`)
    }
}

function mapPolicyEvaluationMetricsResponse(raw: unknown, fieldName: string) {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] ${fieldName} must be an object.`)
    }

    const payload = raw as Record<string, unknown>
    return {
        marginMode: readOptionalTrimmedString(payload.marginMode, `${fieldName}.marginMode`),
        totalPnlPct: readOptionalFiniteNumber(payload.totalPnlPct, `${fieldName}.totalPnlPct`),
        maxDdPct: readOptionalFiniteNumber(payload.maxDdPct, `${fieldName}.maxDdPct`),
        maxDdNoLiqPct: readOptionalFiniteNumber(payload.maxDdNoLiqPct, `${fieldName}.maxDdNoLiqPct`),
        effectiveMaxDdPct: readOptionalFiniteNumber(payload.effectiveMaxDdPct, `${fieldName}.effectiveMaxDdPct`),
        hadLiquidation: readOptionalBoolean(payload.hadLiquidation, `${fieldName}.hadLiquidation`),
        realLiquidationCount: readOptionalFiniteNumber(payload.realLiquidationCount, `${fieldName}.realLiquidationCount`),
        accountRuinCount: readOptionalFiniteNumber(payload.accountRuinCount, `${fieldName}.accountRuinCount`),
        balanceDead: readOptionalBoolean(payload.balanceDead, `${fieldName}.balanceDead`),
        tradesCount: readOptionalFiniteNumber(payload.tradesCount, `${fieldName}.tradesCount`),
        calmar: readOptionalFiniteNumber(payload.calmar, `${fieldName}.calmar`),
        sortino: readOptionalFiniteNumber(payload.sortino, `${fieldName}.sortino`)
    }
}

function mapPolicyEvaluationResponse(raw: unknown, fieldName: string): PolicyEvaluationDto | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] ${fieldName} must be an object.`)
    }

    const payload = raw as Record<string, unknown>
    const reasons = Array.isArray(payload.reasons) ? payload.reasons : []

    return {
        profileId: readRequiredString(payload.profileId, `${fieldName}.profileId`),
        policySetupId: readOptionalTrimmedString(payload.policySetupId, `${fieldName}.policySetupId`),
        status: readRequiredString(payload.status, `${fieldName}.status`) as PolicyEvaluationDto['status'],
        reasons: reasons.map((item, index) => mapPolicyEvaluationReasonResponse(item, `${fieldName}.reasons[${index}]`)),
        thresholds:
            payload.thresholds === null || typeof payload.thresholds === 'undefined' ?
                null
            :   mapPolicyEvaluationThresholdsResponse(payload.thresholds, `${fieldName}.thresholds`),
        metrics: mapPolicyEvaluationMetricsResponse(payload.metrics ?? {}, `${fieldName}.metrics`)
    }
}

function mapCurrentPredictionOosPresetAnalysisRow(
    raw: unknown,
    fieldName: string
): CurrentPredictionOosPresetAnalysisRowDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] ${fieldName} must be an object.`)
    }

    const row = raw as Record<string, unknown>
    return {
        key: readRequiredString(row.key, `${fieldName}.key`),
        isFullOos: readRequiredBoolean(row.isFullOos, `${fieldName}.isFullOos`),
        isExtended: readRequiredBoolean(row.isExtended, `${fieldName}.isExtended`),
        isDefaultPrimary: readRequiredBoolean(row.isDefaultPrimary, `${fieldName}.isDefaultPrimary`),
        isDefaultSecondary: readRequiredBoolean(row.isDefaultSecondary, `${fieldName}.isDefaultSecondary`),
        requestedDaySharePercent: readRequiredFiniteNumber(row.requestedDaySharePercent, `${fieldName}.requestedDaySharePercent`),
        requestedDayShare: readRequiredFiniteNumber(row.requestedDayShare, `${fieldName}.requestedDayShare`),
        targetDayCount: readRequiredFiniteNumber(row.targetDayCount, `${fieldName}.targetDayCount`),
        selectedTradeCount: readRequiredFiniteNumber(row.selectedTradeCount, `${fieldName}.selectedTradeCount`),
        selectedTradeShare: readRequiredFiniteNumber(row.selectedTradeShare, `${fieldName}.selectedTradeShare`),
        selectedDays: readRequiredFiniteNumber(row.selectedDays, `${fieldName}.selectedDays`),
        selectedDayShare: readRequiredFiniteNumber(row.selectedDayShare, `${fieldName}.selectedDayShare`),
        trainDays: readRequiredFiniteNumber(row.trainDays, `${fieldName}.trainDays`),
        trainDayShare: readRequiredFiniteNumber(row.trainDayShare, `${fieldName}.trainDayShare`),
        daysWithTrades: readRequiredFiniteNumber(row.daysWithTrades, `${fieldName}.daysWithTrades`),
        daysWithoutTrades: readRequiredFiniteNumber(row.daysWithoutTrades, `${fieldName}.daysWithoutTrades`),
        startPredictionDateUtc: readRequiredDateString(row.startPredictionDateUtc, `${fieldName}.startPredictionDateUtc`),
        endPredictionDateUtc: readRequiredDateString(row.endPredictionDateUtc, `${fieldName}.endPredictionDateUtc`),
        evaluatedDays: readRequiredFiniteNumber(row.evaluatedDays, `${fieldName}.evaluatedDays`),
        correctPredictions: readRequiredFiniteNumber(row.correctPredictions, `${fieldName}.correctPredictions`),
        wrongPredictions: readRequiredFiniteNumber(row.wrongPredictions, `${fieldName}.wrongPredictions`),
        accuracyPct: readRequiredFiniteNumber(row.accuracyPct, `${fieldName}.accuracyPct`),
        averageConfidencePct: readRequiredFiniteNumber(row.averageConfidencePct, `${fieldName}.averageConfidencePct`),
        averageActualOutcomeProbabilityPct: readRequiredFiniteNumber(
            row.averageActualOutcomeProbabilityPct,
            `${fieldName}.averageActualOutcomeProbabilityPct`
        ),
        averageDecisionMarginPct: readRequiredFiniteNumber(
            row.averageDecisionMarginPct,
            `${fieldName}.averageDecisionMarginPct`
        ),
        bestPolicyName: readOptionalTrimmedString(row.bestPolicyName, `${fieldName}.bestPolicyName`),
        bestPolicyBranch: readOptionalTrimmedString(row.bestPolicyBranch, `${fieldName}.bestPolicyBranch`),
        bestPolicyBucket: readOptionalTrimmedString(row.bestPolicyBucket, `${fieldName}.bestPolicyBucket`),
        bestPolicyMarginMode: readOptionalTrimmedString(row.bestPolicyMarginMode, `${fieldName}.bestPolicyMarginMode`),
        bestPolicyMetrics: mapPolicyPerformanceMetricsOrNull(row.bestPolicyMetrics, {
            owner: 'current-prediction',
            label: `${fieldName}.bestPolicyMetrics`
        }),
        bestPolicyEvaluation: mapPolicyEvaluationResponse(row.bestPolicyEvaluation, `${fieldName}.bestPolicyEvaluation`),
        balancedScore: readRequiredFiniteNumber(row.balancedScore, `${fieldName}.balancedScore`),
        conservativeScore: readRequiredFiniteNumber(row.conservativeScore, `${fieldName}.conservativeScore`),
        aggressiveScore: readRequiredFiniteNumber(row.aggressiveScore, `${fieldName}.aggressiveScore`)
    }
}

function mapCurrentPredictionOosPresetAnalysisResponse(raw: unknown): CurrentPredictionOosPresetAnalysisDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] OOS preset analysis payload must be an object.')
    }

    const payload = raw as Record<string, unknown>
    if (!Array.isArray(payload.rows)) {
        throw new Error('[current-prediction] OOS preset analysis rows payload must be an array.')
    }

    return {
        mode: readRequiredString(payload.mode, 'oosPresetAnalysis.mode'),
        publishedAtUtc: readRequiredString(payload.publishedAtUtc, 'oosPresetAnalysis.publishedAtUtc'),
        oosHistoryDaySharePercent: readRequiredFiniteNumber(
            payload.oosHistoryDaySharePercent,
            'oosPresetAnalysis.oosHistoryDaySharePercent'
        ),
        historyTotalTrades: readRequiredFiniteNumber(payload.historyTotalTrades, 'oosPresetAnalysis.historyTotalTrades'),
        historyTotalDays: readRequiredFiniteNumber(payload.historyTotalDays, 'oosPresetAnalysis.historyTotalDays'),
        historyStartDateUtc: readRequiredDateString(payload.historyStartDateUtc, 'oosPresetAnalysis.historyStartDateUtc'),
        historyEndDateUtc: readRequiredDateString(payload.historyEndDateUtc, 'oosPresetAnalysis.historyEndDateUtc'),
        balancedRecommendationKey: readOptionalTrimmedString(
            payload.balancedRecommendationKey,
            'oosPresetAnalysis.balancedRecommendationKey'
        ),
        conservativeRecommendationKey: readOptionalTrimmedString(
            payload.conservativeRecommendationKey,
            'oosPresetAnalysis.conservativeRecommendationKey'
        ),
        aggressiveRecommendationKey: readOptionalTrimmedString(
            payload.aggressiveRecommendationKey,
            'oosPresetAnalysis.aggressiveRecommendationKey'
        ),
        rows: payload.rows.map((item, index) =>
            mapCurrentPredictionOosPresetAnalysisRow(item, `oosPresetAnalysis.rows[${index}]`)
        )
    }
}

function mapCurrentPredictionIndexItem(raw: unknown, index: number): CurrentPredictionIndexItemDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] index item must be an object. index=${index}.`)
    }

    const item = raw as Record<string, unknown>
    return {
        id: readRequiredString(item.id, `index[${index}].id`),
        predictionDateUtc: readRequiredDateString(item.predictionDateUtc, `index[${index}].predictionDateUtc`)
    }
}

function mapCurrentPredictionTrainingScopeStats(
    raw: unknown
): CurrentPredictionBackfilledTrainingScopeStats | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] trainingScopeStats payload must be an object.')
    }

    const stats = raw as Record<string, unknown>

    return {
        indicatorWarmupStartDateUtc: readRequiredDateString(
            stats.indicatorWarmupStartDateUtc,
            'trainingScopeStats.indicatorWarmupStartDateUtc'
        ),
        fullStartDateUtc: readRequiredDateString(stats.fullStartDateUtc, 'trainingScopeStats.fullStartDateUtc'),
        fullEndDateUtc: readRequiredDateString(stats.fullEndDateUtc, 'trainingScopeStats.fullEndDateUtc'),
        fullDays: readRequiredFiniteNumber(stats.fullDays, 'trainingScopeStats.fullDays'),
        trainStartDateUtc: readRequiredDateString(stats.trainStartDateUtc, 'trainingScopeStats.trainStartDateUtc'),
        trainEndDateUtc: readRequiredDateString(stats.trainEndDateUtc, 'trainingScopeStats.trainEndDateUtc'),
        trainDays: readRequiredFiniteNumber(stats.trainDays, 'trainingScopeStats.trainDays'),
        oosStartDateUtc: readRequiredDateString(stats.oosStartDateUtc, 'trainingScopeStats.oosStartDateUtc'),
        oosEndDateUtc: readRequiredDateString(stats.oosEndDateUtc, 'trainingScopeStats.oosEndDateUtc'),
        oosDays: readRequiredFiniteNumber(stats.oosDays, 'trainingScopeStats.oosDays'),
        recentStartDateUtc: readRequiredDateString(stats.recentStartDateUtc, 'trainingScopeStats.recentStartDateUtc'),
        recentEndDateUtc: readRequiredDateString(stats.recentEndDateUtc, 'trainingScopeStats.recentEndDateUtc'),
        recentDays: readRequiredFiniteNumber(stats.recentDays, 'trainingScopeStats.recentDays'),
        oosHistoryDaySharePercent: readRequiredFiniteNumber(
            stats.oosHistoryDaySharePercent,
            'trainingScopeStats.oosHistoryDaySharePercent'
        ),
        recentHistoryDaySharePercent: readRequiredFiniteNumber(
            stats.recentHistoryDaySharePercent,
            'trainingScopeStats.recentHistoryDaySharePercent'
        ),
        recentMatchesOos: readRequiredBoolean(stats.recentMatchesOos, 'trainingScopeStats.recentMatchesOos'),
        totalDays: readRequiredFiniteNumber(stats.totalDays, 'trainingScopeStats.totalDays'),
        trainShare: readRequiredFiniteNumber(stats.trainShare, 'trainingScopeStats.trainShare'),
        oosShare: readRequiredFiniteNumber(stats.oosShare, 'trainingScopeStats.oosShare'),
        lastTrainDateUtc: readRequiredDateString(stats.lastTrainDateUtc, 'trainingScopeStats.lastTrainDateUtc'),
        firstOosDateUtc: readRequiredDateString(stats.firstOosDateUtc, 'trainingScopeStats.firstOosDateUtc'),
        oosPresetCatalog: mapCurrentPredictionOosPresetCatalog(stats.oosPresetCatalog)
    }
}

function mapCurrentPredictionLivePublicationInfo(raw: unknown): CurrentPredictionLivePublicationInfoDto | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] publication payload must be an object.')
    }

    const publication = raw as Record<string, unknown>

    return {
        targetPredictionDateUtc: readRequiredDateString(
            publication.targetPredictionDateUtc,
            'publication.targetPredictionDateUtc'
        ),
        publishedPredictionDateUtc: readRequiredDateString(
            publication.publishedPredictionDateUtc,
            'publication.publishedPredictionDateUtc'
        ),
        isTargetPredictionDatePublished: readRequiredBoolean(
            publication.isTargetPredictionDatePublished,
            'publication.isTargetPredictionDatePublished'
        ),
        expectedPreview: readRequiredBoolean(publication.expectedPreview, 'publication.expectedPreview')
    }
}

function mapCurrentPredictionHistoryItem(raw: unknown, index: number): CurrentPredictionHistoryItemDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] history item must be an object. index=${index}.`)
    }

    const item = raw as Record<string, unknown>
    if (!item.report || typeof item.report !== 'object') {
        throw new Error(`[current-prediction] history item report is invalid. index=${index}.`)
    }

    return {
        id: readRequiredString(item.id, `history.items[${index}].id`),
        predictionDateUtc: readRequiredDateString(item.predictionDateUtc, `history.items[${index}].predictionDateUtc`),
        report: mapReportResponse(item.report)
    }
}

function mapCurrentPredictionHistoryPageResponse(raw: unknown): CurrentPredictionHistoryPageDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] history page payload must be an object.')
    }

    const payload = raw as Record<string, unknown>
    if (!Array.isArray(payload.items)) {
        throw new Error('[current-prediction] history page items payload must be an array.')
    }

    return {
        page: readRequiredFiniteNumber(payload.page, 'historyPage.page'),
        pageSize: readRequiredFiniteNumber(payload.pageSize, 'historyPage.pageSize'),
        totalPages: readRequiredFiniteNumber(payload.totalPages, 'historyPage.totalPages'),
        totalBuiltReports: readRequiredFiniteNumber(payload.totalBuiltReports, 'historyPage.totalBuiltReports'),
        filteredReports: readRequiredFiniteNumber(payload.filteredReports, 'historyPage.filteredReports'),
        hasPrevPage: readRequiredBoolean(payload.hasPrevPage, 'historyPage.hasPrevPage'),
        hasNextPage: readRequiredBoolean(payload.hasNextPage, 'historyPage.hasNextPage'),
        earliestBuiltPredictionDateUtc: readRequiredDateString(
            payload.earliestBuiltPredictionDateUtc,
            'historyPage.earliestBuiltPredictionDateUtc'
        ),
        latestBuiltPredictionDateUtc: readRequiredDateString(
            payload.latestBuiltPredictionDateUtc,
            'historyPage.latestBuiltPredictionDateUtc'
        ),
        missingBuiltWeekdays: readRequiredFiniteNumber(payload.missingBuiltWeekdays, 'historyPage.missingBuiltWeekdays'),
        expectedBuiltWeekdays: readRequiredFiniteNumber(
            payload.expectedBuiltWeekdays,
            'historyPage.expectedBuiltWeekdays'
        ),
        missingBuiltFromDateUtc: readRequiredDateString(
            payload.missingBuiltFromDateUtc,
            'historyPage.missingBuiltFromDateUtc'
        ),
        missingBuiltToDateUtc: readRequiredDateString(
            payload.missingBuiltToDateUtc,
            'historyPage.missingBuiltToDateUtc'
        ),
        items: payload.items.map((item, index) => mapCurrentPredictionHistoryItem(item, index)),
        trainingScopeStats: mapCurrentPredictionTrainingScopeStats(payload.trainingScopeStats)
    }
}

function mapCurrentPredictionLivePayloadResponse(raw: unknown): CurrentPredictionLivePayloadDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] live payload must be an object.')
    }

    const payload = raw as Record<string, unknown>
    if (!payload.report || typeof payload.report !== 'object') {
        throw new Error('[current-prediction] live payload report is invalid.')
    }

    return {
        report: mapReportResponse(payload.report),
        // Поле publication читается мягко, чтобы rolling deploy не ломал страницу,
        // если frontend уже обновлён, а backend ещё отдаёт старый payload без metadata.
        publication: mapCurrentPredictionLivePublicationInfo(payload.publication),
        trainingScopeStats: mapCurrentPredictionTrainingScopeStats(payload.trainingScopeStats)
    }
}

export async function fetchCurrentPredictionLivePayload(
    scope?: CurrentPredictionTrainingScope
): Promise<CurrentPredictionLivePayloadDto> {
    const search = new URLSearchParams()
    if (scope) {
        search.set('scope', scope)
    }

    const querySuffix = search.toString()
    const url = `${API_BASE_URL}${livePayload.path}${querySuffix ? `?${querySuffix}` : ''}`
    const resp = await fetch(url)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load current live prediction payload', resp, text))
    }

    return mapCurrentPredictionLivePayloadResponse(await resp.json())
}

async function fetchCurrentPredictionIndex(
    set: CurrentPredictionSet,
    days?: number,
    scope?: CurrentPredictionTrainingScope
): Promise<CurrentPredictionIndexItemDto[]> {
    const resolvedScope = resolveCurrentPredictionIndexScope(set, scope)
    const search = new URLSearchParams()

    search.set('set', set)
    search.set('scope', resolvedScope)

    if (typeof days === 'number' && Number.isFinite(days) && days > 0) {
        search.set('days', String(days))
    }

    const querySuffix = search.toString()
    const url = `${API_BASE_URL}${datesIndex.path}${querySuffix ? `?${querySuffix}` : ''}`
    const resp = await fetch(url)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load current prediction index', resp, text))
    }

    const payload = await resp.json()
    if (!Array.isArray(payload)) {
        throw new Error('[current-prediction] index payload must be an array.')
    }

    return payload.map((item, index) => mapCurrentPredictionIndexItem(item, index))
}

export async function fetchCurrentPredictionHistoryPage(
    args: CurrentPredictionHistoryPageQueryArgs
): Promise<CurrentPredictionHistoryPageDto> {
    const resolvedScope = resolveCurrentPredictionIndexScope(args.set, args.scope)
    if (!Number.isInteger(args.page) || args.page <= 0) {
        throw new Error(`[current-prediction] history page must be a positive integer. page=${args.page}.`)
    }
    if (!Number.isInteger(args.pageSize) || args.pageSize <= 0) {
        throw new Error(`[current-prediction] history pageSize must be a positive integer. pageSize=${args.pageSize}.`)
    }

    const search = new URLSearchParams()
    search.set('set', args.set)
    search.set('scope', resolvedScope)
    search.set('page', String(args.page))
    search.set('pageSize', String(args.pageSize))

    if (typeof args.days === 'number' && Number.isFinite(args.days) && args.days > 0) {
        search.set('days', String(args.days))
    }
    if (args.fromDateUtc) {
        search.set('fromDateUtc', normalizeCurrentPredictionDateUtc(args.fromDateUtc))
    }
    if (args.toDateUtc) {
        search.set('toDateUtc', normalizeCurrentPredictionDateUtc(args.toDateUtc))
    }
    const normalizedOosPresetKey = readOptionalTrimmedString(args.oosPresetKey, 'historyPage.oosPresetKey')
    if (normalizedOosPresetKey) {
        search.set('oosPresetKey', normalizedOosPresetKey)
    }

    const url = `${API_BASE_URL}${historyPage.path}?${search.toString()}`
    const resp = await fetch(url)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load current prediction history page', resp, text))
    }

    return mapCurrentPredictionHistoryPageResponse(await resp.json())
}

export async function fetchCurrentPredictionBackfilledTrainingScopeStats(): Promise<CurrentPredictionBackfilledTrainingScopeStats> {
    const historyPagePayload = await fetchCurrentPredictionHistoryPage({
        set: 'backfilled',
        scope: 'full',
        page: 1,
        pageSize: 1
    })

    if (!historyPagePayload.trainingScopeStats) {
        throw new Error(
            '[current-prediction] backfilled training scope stats are missing from history page payload.'
        )
    }

    return historyPagePayload.trainingScopeStats
}

export async function fetchCurrentPredictionOosPresetAnalysis(
    mode: CurrentPredictionOosPresetAnalysisMode
): Promise<CurrentPredictionOosPresetAnalysisDto> {
    const search = new URLSearchParams()
    search.set('mode', mode)

    const response = await fetch(`${API_BASE_URL}${oosPresetAnalysis.path}?${search.toString()}`)
    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load current prediction OOS preset analysis', response, text))
    }

    return mapCurrentPredictionOosPresetAnalysisResponse(await response.json())
}

export function useCurrentPredictionLivePayloadQuery(
    scope?: CurrentPredictionTrainingScope
): UseQueryResult<CurrentPredictionLivePayloadDto, Error> {
    return useQuery({
        queryKey: ['current-prediction', 'live-payload', scope ?? 'default'] as const,
        queryFn: () => fetchCurrentPredictionLivePayload(scope),
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.currentPrediction.livePayload.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.currentPrediction.livePayload.gcTimeMs,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })
}

export function useCurrentPredictionIndexQuery(
    set: CurrentPredictionSet = 'backfilled',
    days?: number,
    scope?: CurrentPredictionTrainingScope,
    options?: CurrentPredictionIndexQueryOptions
): UseQueryResult<CurrentPredictionIndexItemDto[], Error> {
    const resolvedScope = resolveCurrentPredictionIndexScope(set, scope)

    return useQuery({
        queryKey: ['current-prediction', 'dates', set, resolvedScope, days ?? 'all'] as const,
        queryFn: () => fetchCurrentPredictionIndex(set, days, resolvedScope),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.currentPrediction.index.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.currentPrediction.index.gcTimeMs,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })
}

export function useCurrentPredictionHistoryPageQuery(
    args: CurrentPredictionHistoryPageQueryArgs
): UseQueryResult<CurrentPredictionHistoryPageDto, Error> {
    const resolvedScope = resolveCurrentPredictionIndexScope(args.set, args.scope)

    return useQuery({
        queryKey: [
            'current-prediction',
            'history-page',
            args.set,
            resolvedScope,
            args.oosPresetKey ?? 'oos-preset-all',
            args.days ?? 'all',
            args.fromDateUtc ?? 'from-all',
            args.toDateUtc ?? 'to-all',
            args.page,
            args.pageSize
        ] as const,
        queryFn: () => fetchCurrentPredictionHistoryPage({ ...args, scope: resolvedScope }),
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.currentPrediction.historyPage.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.currentPrediction.historyPage.gcTimeMs,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })
}

export function useCurrentPredictionBackfilledTrainingScopeStatsQuery(
    options?: CurrentPredictionTrainingScopeStatsQueryOptions
): UseQueryResult<CurrentPredictionBackfilledTrainingScopeStats, Error> {
    return useQuery({
        queryKey: ['current-prediction', 'backfilled-training-scope-stats'] as const,
        queryFn: () => fetchCurrentPredictionBackfilledTrainingScopeStats(),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.currentPrediction.historyPage.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.currentPrediction.historyPage.gcTimeMs,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })
}

export function useCurrentPredictionOosPresetAnalysisQuery(
    mode: CurrentPredictionOosPresetAnalysisMode,
    options?: CurrentPredictionQueryOptions
): UseQueryResult<CurrentPredictionOosPresetAnalysisDto, Error> {
    return useQuery({
        queryKey: ['current-prediction', 'oos-preset-analysis', mode] as const,
        queryFn: () => fetchCurrentPredictionOosPresetAnalysis(mode),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.currentPrediction.oosPresetAnalysis.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.currentPrediction.oosPresetAnalysis.gcTimeMs,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })
}
