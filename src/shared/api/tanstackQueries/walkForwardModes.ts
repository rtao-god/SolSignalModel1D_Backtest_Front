import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '@/shared/configs/config'
import { API_ROUTES } from '@/shared/api/routes'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'
import type { WalkForwardModeId, WalkForwardReportSliceId } from '@/entities/mode'
import type { PolicyEvaluationDto } from '@/shared/types/policyEvaluation.types'
import type { PolicyPerformanceMetricsDto } from '@/shared/types/policyPerformanceMetrics.types'
import type { PolicyRatiosReportDto } from '@/shared/types/policyRatios.types'
import type { TableSectionDto } from '@/shared/types/report.types'

export type WalkForwardSlice = 'all' | 'recent_240d' | 'selected_fold'

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
    reportSlice: WalkForwardReportSliceId
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

export type ValidationScoreMetricDto = 'SharpeAnnualized' | number

export interface PurgedCrossValidationSummaryDto {
    scoreMetric: ValidationScoreMetricDto
    observationCount: number
    groupCount: number
    testGroupCount: number
    embargoGroupCount: number
    foldCount: number
    meanScore: number
    stdScore: number
    minScore: number
    maxScore: number
    meanTrainObservationCount: number
    meanTestObservationCount: number
    meanPurgedObservationCount: number
    meanEmbargoedObservationCount: number
}

export interface ProbabilityOfBacktestOverfittingSummaryDto {
    scoreMetric: ValidationScoreMetricDto
    configCount: number
    observationCount: number
    groupCount: number
    inSampleGroupCount: number
    outOfSampleGroupCount: number
    embargoGroupCount: number
    splitCount: number
    overfitSplitCount: number
    pbo: number
    meanLogit: number
    medianLogit: number
    meanInSampleObservationCount: number
    meanOutOfSampleObservationCount: number
    meanSelectedConfigOutOfSampleRankPercentile: number
    meanSelectedConfigOutOfSampleScore: number
}

export interface TbmNativeValidationSummaryDto {
    slice: WalkForwardReportSliceId
    completedFoldCount: number
    completedDayCount: number
    dsr: number
    annualizationFactor: number
    riskFreeRate: number
    cpcv: PurgedCrossValidationSummaryDto
    pbo: ProbabilityOfBacktestOverfittingSummaryDto
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
}

export interface TbmNativeStatisticsCardDto {
    slice: WalkForwardReportSliceId
    classSummary: TbmNativeClassSummaryEntryDto[]
    confusionMatrix: TbmNativeConfusionMatrixEntryDto[]
    calibration: TbmNativeCalibrationBinDto[]
    sliceSummary: TbmNativeSliceSummaryCardDto
}

export interface TbmNativeModelStatsPageDto {
    cards: TbmNativeStatisticsCardDto[]
}

export interface TbmNativeProbabilityAggregationEntryDto {
    slice: WalkForwardReportSliceId
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
    slice: WalkForwardReportSliceId
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
    slice: WalkForwardReportSliceId
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
    reportSlice: WalkForwardReportSliceId
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
    slice: WalkForwardReportSliceId
    completedFoldCount: number
    completedDayCount: number
    dsr: number
    annualizationFactor: number
    riskFreeRate: number
    cpcv: PurgedCrossValidationSummaryDto
    pbo: ProbabilityOfBacktestOverfittingSummaryDto
}

export interface DirectionalWalkForwardCurrentDto extends DirectionalWalkForwardHistoryDayItemDto {}

export interface DirectionalWalkForwardPerModelMetricEntryDto {
    modelName: string
    slice: WalkForwardReportSliceId
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
    slice: WalkForwardReportSliceId
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
    slice: WalkForwardReportSliceId
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
    slice: WalkForwardReportSliceId
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
    slice: WalkForwardReportSliceId
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

export interface BestPolicyScoreComponentDto {
    key: string
    label: string
    value: number
}

export interface BestPolicyScoreDto {
    value: number
    formula: string
    components: BestPolicyScoreComponentDto[]
}

export interface BestPolicySliceDto {
    scopeKey: string
}

export interface BestPolicyContractDto {
    bucket: string
    slice: BestPolicySliceDto
    marginMode: string
    policyName: string
    policyBranch: string
    shortDescription: string
    metrics: PolicyPerformanceMetricsDto
    evaluation: PolicyEvaluationDto
    score: BestPolicyScoreDto
}

export interface BestPolicyPerMarginModeDto {
    cross?: BestPolicyContractDto | null
    isolated?: BestPolicyContractDto | null
}

export interface BestPolicyArtifactDto {
    id: string
    generatedAtUtc: string
    bucket: string
    slice: BestPolicySliceDto
    perMarginMode: BestPolicyPerMarginModeDto
}

export interface TbmNativeMoneySliceDto {
    slice: WalkForwardReportSliceId
    policySummary: {
        signalDays: number
    }
    policyRatios: PolicyRatiosReportDto
    policyBranchMegaTable: TableSectionDto
    bestPolicy: BestPolicyArtifactDto
}

export interface TbmNativeMoneyPageDto {
    policyArtifactsVersion: number
    slices: TbmNativeMoneySliceDto[]
}

export interface DirectionalWalkForwardMoneySliceDto {
    slice: WalkForwardReportSliceId
    policySummary: {
        signalDays: number
    }
    policyRatios: PolicyRatiosReportDto
    policyBranchMegaTable: TableSectionDto
    bestPolicy: BestPolicyArtifactDto
}

export interface DirectionalWalkForwardMoneyPageDto {
    policyArtifactsVersion: number
    slices: DirectionalWalkForwardMoneySliceDto[]
}

export interface WalkForwardHistoryQueryArgs {
    slice?: WalkForwardSlice
    selectedFoldId?: string | null
    reportSlice: WalkForwardReportSliceId | null
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

function requireReportSlice(reportSlice: WalkForwardReportSliceId | null | undefined, owner: string): WalkForwardReportSliceId {
    if (!reportSlice) {
        throw new Error(`[walk-forward-api] report slice is missing. owner=${owner}; expected=explicit reportSlice from mode registry selector; actual=empty; requiredAction=load the mode registry before enabling this query.`)
    }

    return reportSlice
}

function buildHistoryPath(basePath: string, args: WalkForwardHistoryQueryArgs, owner: string): string {
    return `${basePath}${buildQueryString({
        slice: args.slice,
        selectedFoldId: args.selectedFoldId ?? null,
        reportSlice: requireReportSlice(args.reportSlice, owner),
        fromDate: args.fromDate ?? null,
        toDate: args.toDate ?? null
    })}`
}

function buildReportSlicePath(basePath: string, reportSlice: WalkForwardReportSliceId | null, owner: string): string {
    return `${basePath}${buildQueryString({ reportSlice: requireReportSlice(reportSlice, owner) })}`
}

export function useTbmNativeHistoryQuery(
    args: WalkForwardHistoryQueryArgs,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativeHistoryPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'history', args.slice ?? 'all', args.selectedFoldId ?? null, args.reportSlice, args.fromDate ?? null, args.toDate ?? null],
        queryFn: () => fetchJson<TbmNativeHistoryPageDto>(buildHistoryPath(API_ROUTES.tbmNative.history.path, args, 'tbm-native history query')),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useTbmNativeMoneyQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativeMoneyPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'money', reportSlice],
        queryFn: () => fetchJson<TbmNativeMoneyPageDto>(buildReportSlicePath(API_ROUTES.tbmNative.money.path, reportSlice, 'tbm-native money query')),
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

export function useTbmNativeValidationQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativeValidationSummaryDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'validation', reportSlice],
        queryFn: () => fetchJson<TbmNativeValidationSummaryDto>(buildReportSlicePath(API_ROUTES.tbmNative.validation.path, reportSlice, 'tbm-native validation query')),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useTbmNativeModelStatsQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativeModelStatsPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'model-stats', reportSlice],
        queryFn: () => fetchJson<TbmNativeModelStatsPageDto>(buildReportSlicePath(API_ROUTES.tbmNative.modelStats.path, reportSlice, 'tbm-native model-stats query')),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useTbmNativeAggregationQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativeAggregationSummaryDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'aggregation', reportSlice],
        queryFn: () => fetchJson<TbmNativeAggregationSummaryDto>(buildReportSlicePath(API_ROUTES.tbmNative.aggregation.path, reportSlice, 'tbm-native aggregation query')),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useTbmNativePfiQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<TbmNativePfiPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'tbm-native', 'pfi', reportSlice],
        queryFn: () => fetchJson<TbmNativePfiPageDto>(buildReportSlicePath(API_ROUTES.tbmNative.pfi.path, reportSlice, 'tbm-native pfi query')),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardHistoryQuery(
    args: WalkForwardHistoryQueryArgs,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardHistoryPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'history', args.slice ?? 'all', args.selectedFoldId ?? null, args.reportSlice, args.fromDate ?? null, args.toDate ?? null],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardHistoryPageDto>(
                buildHistoryPath(API_ROUTES.directionalWalkForward.history.path, args, 'directional-walkforward history query')
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

export function useDirectionalWalkForwardMoneyQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardMoneyPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'money', reportSlice],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardMoneyPageDto>(
                buildReportSlicePath(API_ROUTES.directionalWalkForward.money.path, reportSlice, 'directional-walkforward money query')
            ),
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
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardValidationSummaryDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'validation', reportSlice],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardValidationSummaryDto>(
                buildReportSlicePath(API_ROUTES.directionalWalkForward.validation.path, reportSlice, 'directional-walkforward validation query')
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardModelStatsQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardModelStatsPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'model-stats', reportSlice],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardModelStatsPageDto>(
                buildReportSlicePath(API_ROUTES.directionalWalkForward.modelStats.path, reportSlice, 'directional-walkforward model-stats query')
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardAggregationQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardAggregationSummaryDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'aggregation', reportSlice],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardAggregationSummaryDto>(
                buildReportSlicePath(API_ROUTES.directionalWalkForward.aggregation.path, reportSlice, 'directional-walkforward aggregation query')
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardPfiPerModelQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardPfiPerModelPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'pfi-per-model', reportSlice],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardPfiPerModelPageDto>(
                buildReportSlicePath(API_ROUTES.directionalWalkForward.pfiPerModel.path, reportSlice, 'directional-walkforward pfi-per-model query')
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export function useDirectionalWalkForwardPfiSlModelQuery(
    reportSlice: WalkForwardReportSliceId | null,
    options?: WalkForwardQueryOptions
): UseQueryResult<DirectionalWalkForwardPfiSlPageDto, Error> {
    return useQuery({
        queryKey: ['walk-forward', 'directional-walkforward', 'pfi-sl-model', reportSlice],
        queryFn: () =>
            fetchJson<DirectionalWalkForwardPfiSlPageDto>(
                buildReportSlicePath(API_ROUTES.directionalWalkForward.pfiSlModel.path, reportSlice, 'directional-walkforward pfi-sl-model query')
            ),
        enabled: options?.enabled ?? true,
        retry: false
    })
}
