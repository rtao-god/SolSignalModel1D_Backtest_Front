import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '@/shared/configs/config'
import { API_ROUTES } from '@/shared/api/routes'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'
import type { ModeId } from '@/entities/mode'

export type WalkForwardModeId = Extract<ModeId, 'tbm_native' | 'directional_walkforward'>
export type WalkForwardSlice = 'all' | 'recent_240d' | 'selected_fold'
export type WalkForwardFreshness = 'overall' | 'fresh_only' | 'stale_only'

export interface WalkForwardFoldMetadataDto {
    foldId: string
    trainWindowStartUtc: string
    trainWindowEndUtc: string
    evaluationWindowStartUtc: string
    evaluationWindowEndUtc: string
    retrainDecision: string
    servingDecision: string
    deferredReason?: string | null
}

export interface TbmNativeHistoryDayItemDto {
    dayKey: string
    foldMetadata: WalkForwardFoldMetadataDto
    predictionOriginId: string
    dataCutoffUtc: string
    probabilityPositive: number
    probabilityNeutral: number
    probabilityNegative: number
    predictedClass: string
    actualClass: string
    matchFlag: boolean
    modelFreshness: string
    servingDecision: string
    sourceModelFoldId?: string | null
    modelAgeDays: number
}

export interface TbmNativeHistorySummaryDto {
    completedDayCount: number
    freshDayCount: number
    staleDayCount: number
    noModelDayCount: number
    hitCount: number
    hitRate: number
    preStartGapDays: number
    bootstrapDeferredFoldCount: number
}

export interface TbmNativeHistoryPageDto {
    items: TbmNativeHistoryDayItemDto[]
    summary: TbmNativeHistorySummaryDto
}

export interface TbmNativeFoldSummaryItemDto {
    metadata: WalkForwardFoldMetadataDto
    completedEvaluationDayCount: number
    noModelDayCount: number
    freshDayCount: number
    staleDayCount: number
    isCompletedFold: boolean
    sourceModelFoldId?: string | null
}

export interface TbmNativeFoldSummaryPageDto {
    items: TbmNativeFoldSummaryItemDto[]
    completedFoldCount: number
    deferredFoldCount: number
    preStartGapDays: number
}

export interface TbmNativeValidationSummaryDto {
    completedFoldCount: number
    completedDayCount: number
    dsr: number
    annualizationFactor: number
    riskFreeRate: number
    cpcvSummary: string
    pboStatus: string
    pboIsPublished: boolean
}

export interface TbmNativeClassSummaryEntryDto {
    class: string
    sampleCount: number
    hitCount: number
    hitRate: number
    missCount: number
}

export interface TbmNativeConfusionMatrixEntryDto {
    actualClass: string
    countNegative: number
    countNeutral: number
    countPositive: number
}

export interface TbmNativeCalibrationBinDto {
    bin: number
    predictedProbabilityMean: number
    realizedFrequency: number
    sampleCount: number
}

export interface TbmNativeSliceSummaryCardDto {
    foldCount: number
    completedDayCount: number
    freshDayCount: number
    staleDayCount: number
    noModelDayCount: number
    dsr: number
    cpcvSummary: string
}

export interface TbmNativeStatisticsCardDto {
    freshness: string
    classSummary: TbmNativeClassSummaryEntryDto[]
    confusionMatrix: TbmNativeConfusionMatrixEntryDto[]
    calibration: TbmNativeCalibrationBinDto[]
    sliceSummary: TbmNativeSliceSummaryCardDto
}

export interface TbmNativeModelStatsPageDto {
    cards: TbmNativeStatisticsCardDto[]
}

export interface TbmNativeProbabilityAggregationEntryDto {
    slice: string
    avgProbabilityPositive: number
    avgProbabilityNeutral: number
    avgProbabilityNegative: number
}

export interface TbmNativePredictionVsActualConfusionEntryDto {
    actualClass: string
    countNegative: number
    countNeutral: number
    countPositive: number
}

export interface TbmNativeCalibrationSummaryEntryDto {
    bin: number
    predictedProbabilityMean: number
    realizedFrequency: number
    sampleCount: number
}

export interface TbmNativeStrategyOutcomeBucketDto {
    bucketName: string
    sampleCount: number
    avgReturn: number
    hitRate: number
}

export interface TbmNativeAggregationSectionDto {
    sectionName: string
    probabilityEntries: TbmNativeProbabilityAggregationEntryDto[]
    predictionVsActualConfusion: TbmNativePredictionVsActualConfusionEntryDto[]
    calibrationSummary: TbmNativeCalibrationSummaryEntryDto[]
    outcomeBuckets: TbmNativeStrategyOutcomeBucketDto[]
}

export interface TbmNativeAggregationSummaryDto {
    sections: TbmNativeAggregationSectionDto[]
}

export interface TbmNativePfiEntryDto {
    featureName: string
    meanImportanceDelta: number
    stdImportanceDelta: number
    affectedSampleCount: number
}

export interface TbmNativePfiSectionDto {
    freshness: string
    entries: TbmNativePfiEntryDto[]
}

export interface TbmNativePfiPageDto {
    sections: TbmNativePfiSectionDto[]
}

export interface DirectionalProbabilityVectorDto {
    probabilityUp: number
    probabilityFlat: number
    probabilityDown: number
}

export interface DirectionalVerdictDto {
    ruleVersion: string
    resolvedActualClass: string
    technicalVerdict: string
    businessVerdict: string
    timingVerdict: string
    timingConfirmedByDayKeyUtc?: string | null
    usesPureFlatTolerance: boolean
    usesNextDayConfirmation: boolean
}

export interface WalkForwardGateRequirementDto {
    bucketName: string
    requiredCount: number
    actualCount: number
    deficit: number
    passed: boolean
}

export interface WalkForwardModelGateDiagnosticsDto {
    modelName: string
    passed: boolean
    classRequirements: WalkForwardGateRequirementDto[]
}

export interface WalkForwardFoldGateDiagnosticsDto {
    trainingSamplesPassed: boolean
    trainingSamplesRequirement: WalkForwardGateRequirementDto
    diversityPassed: boolean
    diversityRequirements: WalkForwardGateRequirementDto[]
    classSupportPassed: boolean
    modelRequirements: WalkForwardModelGateDiagnosticsDto[]
    overallPassed: boolean
}

export interface DirectionalWalkForwardHistoryDayItemDto {
    dayKey: string
    foldMetadata: WalkForwardFoldMetadataDto
    predictionOriginId: string
    dataCutoffUtc: string
    directionalClass: string
    actualDirectionalClass: string
    dayPredictionClass: string
    microPredictionClass: string
    slRiskClass: string
    dayProbabilities: DirectionalProbabilityVectorDto
    microProbabilities: DirectionalProbabilityVectorDto
    slProbability: number
    verdict: DirectionalVerdictDto
    modelFreshness: string
    servingDecision: string
    sourceModelFoldId?: string | null
    modelAgeDays: number
}

export interface DirectionalWalkForwardHistorySummaryDto {
    completedDayCount: number
    freshDayCount: number
    staleDayCount: number
    noModelDayCount: number
    technicalHitCount: number
    technicalHitRate: number
    businessHitCount: number
    businessHitRate: number
    lateCorrectCount: number
    latePendingCount: number
    preStartGapDays: number
    bootstrapDeferredFoldCount: number
}

export interface DirectionalWalkForwardHistoryPageDto {
    items: DirectionalWalkForwardHistoryDayItemDto[]
    summary: DirectionalWalkForwardHistorySummaryDto
}

export interface DirectionalWalkForwardFoldSummaryItemDto {
    metadata: WalkForwardFoldMetadataDto
    completedEvaluationDayCount: number
    noModelDayCount: number
    freshDayCount: number
    staleDayCount: number
    isCompletedFold: boolean
    sourceModelFoldId?: string | null
    gateDiagnostics: WalkForwardFoldGateDiagnosticsDto
}

export interface DirectionalWalkForwardFoldSummaryPageDto {
    items: DirectionalWalkForwardFoldSummaryItemDto[]
    completedFoldCount: number
    deferredFoldCount: number
    preStartGapDays: number
}

export interface DirectionalWalkForwardValidationSummaryDto {
    completedFoldCount: number
    completedDayCount: number
    dsr: number
    annualizationFactor: number
    riskFreeRate: number
    cpcvSummary: string
    pboStatus: string
    pboIsPublished: boolean
}

export interface DirectionalWalkForwardCurrentDto extends DirectionalWalkForwardHistoryDayItemDto {}

export interface DirectionalWalkForwardPerModelMetricEntryDto {
    modelName: string
    slice: string
    sampleCount: number
    accuracy: number
    microF1: number
    logLoss: number
}

export interface DirectionalWalkForwardConfusionMatrixEntryDto {
    actualClass: string
    countDown: number
    countFlat: number
    countUp: number
}

export interface DirectionalWalkForwardSlMetricEntryDto {
    slice: string
    sampleCount: number
    accuracy: number
    logLoss: number
    auc: number
}

export interface DirectionalWalkForwardSliceSummaryCardDto {
    foldCount: number
    completedDayCount: number
    freshDayCount: number
    staleDayCount: number
    noModelDayCount: number
    dsr: number
    cpcvSummary: string
}

export interface DirectionalWalkForwardTechnicalStatisticsSectionDto {
    perModelMetrics: DirectionalWalkForwardPerModelMetricEntryDto[]
    directionalConfusionMatrix: DirectionalWalkForwardConfusionMatrixEntryDto[]
    slMetrics: DirectionalWalkForwardSlMetricEntryDto[]
}

export interface DirectionalWalkForwardVerdictRateEntryDto {
    verdictName: string
    count: number
    rate: number
}

export interface DirectionalWalkForwardTimingRateEntryDto {
    timingVerdict: string
    count: number
    rate: number
}

export interface DirectionalWalkForwardBusinessStatisticsSectionDto {
    technicalVerdicts: DirectionalWalkForwardVerdictRateEntryDto[]
    businessVerdicts: DirectionalWalkForwardVerdictRateEntryDto[]
    timingVerdicts: DirectionalWalkForwardTimingRateEntryDto[]
}

export interface DirectionalWalkForwardStatisticsCardDto {
    freshness: string
    technical: DirectionalWalkForwardTechnicalStatisticsSectionDto
    business: DirectionalWalkForwardBusinessStatisticsSectionDto
    sliceSummary: DirectionalWalkForwardSliceSummaryCardDto
}

export interface DirectionalWalkForwardModelStatsPageDto {
    cards: DirectionalWalkForwardStatisticsCardDto[]
}

export interface DirectionalWalkForwardLayerProbabilityEntryDto {
    layer: string
    avgProbabilityUp: number
    avgProbabilityFlat: number
    avgProbabilityDown: number
}

export interface DirectionalWalkForwardLayerMetricEntryDto {
    layer: string
    accuracy: number
    microF1: number
    logLoss: number
}

export interface DirectionalWalkForwardBusinessAggregationMetricsDto {
    sampleCount: number
    technicalHitRate: number
    businessHitRate: number
    lateCorrectCount: number
    latePendingCount: number
}

export interface DirectionalWalkForwardTimingBucketDto {
    timingVerdict: string
    sampleCount: number
    share: number
}

export interface DirectionalWalkForwardLatestDaysBucketDto {
    bucketName: string
    sampleCount: number
    avgReturn: number
    technicalHitRate: number
    businessHitRate: number
}

export interface DirectionalWalkForwardAggregationSectionDto {
    sectionName: string
    layerProbabilities: DirectionalWalkForwardLayerProbabilityEntryDto[]
    layerMetrics: DirectionalWalkForwardLayerMetricEntryDto[]
    businessMetrics: DirectionalWalkForwardBusinessAggregationMetricsDto
    timingBuckets: DirectionalWalkForwardTimingBucketDto[]
    latestDaysBreakdown: DirectionalWalkForwardLatestDaysBucketDto[]
}

export interface DirectionalWalkForwardAggregationSummaryDto {
    sections: DirectionalWalkForwardAggregationSectionDto[]
}

export interface DirectionalWalkForwardPfiEntryDto {
    featureName: string
    meanImportanceDelta: number
    stdImportanceDelta: number
    affectedSampleCount: number
}

export interface DirectionalWalkForwardPfiSectionDto {
    freshness: string
    entries: DirectionalWalkForwardPfiEntryDto[]
}

export interface DirectionalWalkForwardPfiPerModelSectionDto {
    modelName: string
    slices: DirectionalWalkForwardPfiSectionDto[]
}

export interface DirectionalWalkForwardPfiPerModelPageDto {
    models: DirectionalWalkForwardPfiPerModelSectionDto[]
}

export interface DirectionalWalkForwardPfiSlPageDto {
    slices: DirectionalWalkForwardPfiSectionDto[]
}

export interface WalkForwardHistoryQueryArgs {
    slice?: WalkForwardSlice
    selectedFoldId?: string | null
    freshness?: WalkForwardFreshness
    fromDate?: string | null
    toDate?: string | null
}

interface WalkForwardQueryOptions {
    enabled?: boolean
}

function buildQueryString(params: Record<string, string | null | undefined>): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim().length > 0) {
            searchParams.set(key, value)
        }
    })

    const query = searchParams.toString()
    return query ? `?${query}` : ''
}

async function fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage(`Failed to load ${path}`, response, text))
    }

    return (await response.json()) as T
}

function buildHistoryPath(basePath: string, args?: WalkForwardHistoryQueryArgs): string {
    return `${basePath}${buildQueryString({
        slice: args?.slice,
        selectedFoldId: args?.selectedFoldId ?? null,
        freshness: args?.freshness,
        fromDate: args?.fromDate ?? null,
        toDate: args?.toDate ?? null
    })}`
}

function buildFreshnessPath(basePath: string, freshness?: WalkForwardFreshness): string {
    return `${basePath}${buildQueryString({ freshness: freshness ?? 'overall' })}`
}

export function useTbmNativeHistoryQuery(
    args?: WalkForwardHistoryQueryArgs,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativeHistoryPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'history', args?.slice ?? 'all', args?.selectedFoldId ?? null, args?.freshness ?? 'overall', args?.fromDate ?? null, args?.toDate ?? null],
        queryFn: () => fetchJson<TbmNativeHistoryPageDto>(buildHistoryPath(API_ROUTES.tbmNative.history.path, args)),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useTbmNativeFoldsQuery(options?: WalkForwardQueryOptions): UseQueryResult<TbmNativeFoldSummaryPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'folds'],
        queryFn: () => fetchJson<TbmNativeFoldSummaryPageDto>(API_ROUTES.tbmNative.folds.path),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useTbmNativeValidationQuery(options?: WalkForwardQueryOptions): UseQueryResult<TbmNativeValidationSummaryDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'validation'],
        queryFn: () => fetchJson<TbmNativeValidationSummaryDto>(API_ROUTES.tbmNative.validation.path),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useTbmNativeModelStatsQuery(
    freshness: WalkForwardFreshness,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativeModelStatsPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'model-stats', freshness],
        queryFn: () => fetchJson<TbmNativeModelStatsPageDto>(buildFreshnessPath(API_ROUTES.tbmNative.modelStats.path, freshness)),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useTbmNativeAggregationQuery(
    freshness: WalkForwardFreshness,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativeAggregationSummaryDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'aggregation', freshness],
        queryFn: () => fetchJson<TbmNativeAggregationSummaryDto>(buildFreshnessPath(API_ROUTES.tbmNative.aggregation.path, freshness)),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useTbmNativePfiQuery(
    freshness: WalkForwardFreshness,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativePfiPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'pfi', freshness],
        queryFn: () => fetchJson<TbmNativePfiPageDto>(buildFreshnessPath(API_ROUTES.tbmNative.pfi.path, freshness)),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardHistoryQuery(
    args?: WalkForwardHistoryQueryArgs,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardHistoryPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'history', args?.slice ?? 'all', args?.selectedFoldId ?? null, args?.freshness ?? 'overall', args?.fromDate ?? null, args?.toDate ?? null],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardHistoryPageDto>(
                buildHistoryPath(API_ROUTES.directionalWalkForward.history.path, args)
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardCurrentQuery(
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardCurrentDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'current'],
        queryFn: () => fetchJson<DirectionalWalkForwardCurrentDto>(API_ROUTES.directionalWalkForward.current.path),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardFoldsQuery(
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardFoldSummaryPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'folds'],
        queryFn: () => fetchJson<DirectionalWalkForwardFoldSummaryPageDto>(API_ROUTES.directionalWalkForward.folds.path),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardValidationQuery(
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardValidationSummaryDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'validation'],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardValidationSummaryDto>(API_ROUTES.directionalWalkForward.validation.path),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardModelStatsQuery(
    freshness: WalkForwardFreshness,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardModelStatsPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'model-stats', freshness],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardModelStatsPageDto>(
                buildFreshnessPath(API_ROUTES.directionalWalkForward.modelStats.path, freshness)
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardAggregationQuery(
    freshness: WalkForwardFreshness,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardAggregationSummaryDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'aggregation', freshness],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardAggregationSummaryDto>(
                buildFreshnessPath(API_ROUTES.directionalWalkForward.aggregation.path, freshness)
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardPfiPerModelQuery(
    freshness: WalkForwardFreshness,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardPfiPerModelPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'pfi-per-model', freshness],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardPfiPerModelPageDto>(
                buildFreshnessPath(API_ROUTES.directionalWalkForward.pfiPerModel.path, freshness)
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardPfiSlModelQuery(
    freshness: WalkForwardFreshness,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardPfiSlPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'pfi-sl-model', freshness],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardPfiSlPageDto>(
                buildFreshnessPath(API_ROUTES.directionalWalkForward.pfiSlModel.path, freshness)
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}
