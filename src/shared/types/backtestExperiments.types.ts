import type {
    BacktestPreviewBundleDto,
    BacktestRiskBudgetConfigDto,
    ExecutionProfileConfigDto
} from './backtest.types'
import type { PolicyEvaluationDto } from './policyEvaluation.types'
import type { PolicyPerformanceMetricsDto } from './policyPerformanceMetrics.types'
export type { PolicyPerformanceMetricsDto } from './policyPerformanceMetrics.types'

export type ExperimentVariantStatus = 'Draft' | 'Approved' | 'Archived'
export type ExperimentActivationSlot = 'OfflineCurrent' | 'LiveCurrent'
export type ExperimentFeatureDisplayScale =
    | 'Raw'
    | 'Percent'
    | 'Rsi0To100'
    | 'Fng0To100'
    | 'RsiSlopePoints'
export type ExperimentSandboxRunStatus = 'Completed' | 'Failed'
export type ExperimentSandboxVerdictStatus = 'Pass' | 'Borderline' | 'Fail'

export interface ExperimentStatusHistoryEntryDto {
    changedAtUtc: string
    actor: string
    status: ExperimentVariantStatus
    note?: string | null
}

export interface ExperimentFeatureCatalogItemDto {
    featureName: string
    displayName: string
    description: string
    unit: string
    displayScale: ExperimentFeatureDisplayScale
    displayMin?: number | null
    displayMax?: number | null
    defaultStep?: number | null
}

export interface ModelFeatureZoneRuleDto {
    name: string
    minDisplayValueInclusive?: number | null
    maxDisplayValueExclusive?: number | null
    scale: number
    offset: number
    replaceWith?: number | null
}

export interface ModelFeatureRuleDto {
    featureName: string
    enabled: boolean
    scale: number
    offset: number
    clampMin?: number | null
    clampMax?: number | null
    zones: ModelFeatureZoneRuleDto[]
}

export interface ModelDirectionalOverlayRuleDto {
    id: string
    name: string
    featureName: string
    minDisplayValueInclusive?: number | null
    maxDisplayValueExclusive?: number | null
    upProbabilityScale: number
    flatProbabilityScale: number
    downProbabilityScale: number
}

export interface ModelSubModelTrainingOptionsDto {
    enabled: boolean
    numberOfLeaves: number
    numberOfIterations: number
    learningRate: number
    minimumExampleCountPerLeaf: number
}

export interface ModelLayerProfileDto {
    id: string
    versionNumber: number
    name: string
    description?: string | null
    isSystem: boolean
    compatibilityKey: string
    author: string
    createdAtUtc: string
    status: ExperimentVariantStatus
    contentHash: string
    codeRevision: string
    statusHistory: ExperimentStatusHistoryEntryDto[]
    featureRules: ModelFeatureRuleDto[]
    directionalRules: ModelDirectionalOverlayRuleDto[]
    moveModel: ModelSubModelTrainingOptionsDto
    dirNormalModel: ModelSubModelTrainingOptionsDto
    dirDownModel: ModelSubModelTrainingOptionsDto
    microFlatModel: ModelSubModelTrainingOptionsDto
}

export interface BacktestPolicyDefinitionDto {
    name: string
    policyType: string
    leverage?: number | null
    marginMode: string
    groupKey: string
}

export interface BacktestPolicyGroupDto {
    groupKey: string
    name: string
    description: string
    policies: BacktestPolicyDefinitionDto[]
}

export interface BacktestPolicyCatalogDto {
    groups: BacktestPolicyGroupDto[]
}

export interface BacktestScenarioAxisValueDto {
    key: string
    name: string
    description: string
}

export interface BacktestScenarioAxisDto {
    axisKey: string
    name: string
    description: string
    values: BacktestScenarioAxisValueDto[]
}

export interface BacktestScenarioBlockDto {
    blockKey: string
    name: string
    description: string
    branchKey: string
    stopLossModeKey: string
}

export interface BacktestScenarioCatalogDto {
    axes: BacktestScenarioAxisDto[]
    blocks: BacktestScenarioBlockDto[]
    defaultBlockKey: string
}

export interface BacktestSelectionPolicyDto {
    allowedPolicyGroupKeys: string[]
    defaultPolicyGroupKeys: string[]
    allowedScenarioBlockKeys: string[]
    defaultScenarioBlockKeys: string[]
}

export interface BacktestPolicyScenarioRowDto {
    policyName: string
    policyGroupKey: string
    policyType: string
    marginMode: string
    scenarioBlockKey: string
    branchKey: string
    stopLossModeKey: string
    metrics: PolicyPerformanceMetricsDto
}

export interface BacktestPolicyScenarioMatrixDto {
    policyCatalog: BacktestPolicyCatalogDto
    scenarioCatalog: BacktestScenarioCatalogDto
    rows: BacktestPolicyScenarioRowDto[]
}

export interface PolicyLayerProfileDto {
    id: string
    versionNumber: number
    name: string
    description?: string | null
    isSystem: boolean
    compatibilityKey: string
    author: string
    createdAtUtc: string
    status: ExperimentVariantStatus
    contentHash: string
    codeRevision: string
    statusHistory: ExperimentStatusHistoryEntryDto[]
    calcMode: number
    executionProfile: ExecutionProfileConfigDto
    riskBudget?: BacktestRiskBudgetConfigDto | null
    trainUntilExitDayKeyUtcIsoDate?: string | null
    policyGroupKeys: string[]
}

export interface BucketLayerProfileDto {
    id: string
    versionNumber: number
    name: string
    description?: string | null
    isSystem: boolean
    compatibilityKey: string
    author: string
    createdAtUtc: string
    status: ExperimentVariantStatus
    contentHash: string
    codeRevision: string
    statusHistory: ExperimentStatusHistoryEntryDto[]
    reportBucketPolicy: number
}

export interface ExperimentBundleDto {
    id: string
    versionNumber: number
    name: string
    description?: string | null
    isSystem: boolean
    compatibilityKey: string
    author: string
    createdAtUtc: string
    status: ExperimentVariantStatus
    contentHash: string
    codeRevision: string
    statusHistory: ExperimentStatusHistoryEntryDto[]
    modelLayerId: string
    policyLayerId: string
    bucketLayerId: string
}

export interface ExperimentActivationPointerDto {
    slot: ExperimentActivationSlot
    bundleId: string
    actor: string
    activatedAtUtc: string
    note?: string | null
}

export interface ExperimentActivationHistoryEntryDto {
    slot: ExperimentActivationSlot
    bundleId: string
    actor: string
    activatedAtUtc: string
    note?: string | null
}

export interface ExperimentSandboxRunDto {
    id: string
    author: string
    createdAtUtc: string
    completedAtUtc?: string | null
    status: ExperimentSandboxRunStatus
    codeRevision: string
    bundleId?: string | null
    modelLayerId: string
    policyLayerId: string
    bucketLayerId: string
    baselineBundleId: string
    tpSlMode: string
    failureMessage?: string | null
    dataFromUtc?: string | null
    dataToUtc?: string | null
    candidateBestTotalPnlPct: number
    candidateWorstMaxDdPct: number
    candidateTotalTrades: number
    baselineBestTotalPnlPct: number
    baselineWorstMaxDdPct: number
    baselineTotalTrades: number
    bestTotalPnlPctDelta: number
    worstMaxDdPctDelta: number
    totalTradesDelta: number
    candidateMegaReportId?: string | null
    baselineMegaReportId?: string | null
    verdictStatus?: ExperimentSandboxVerdictStatus | null
    candidateRowCount?: number | null
    baselineRowCount?: number | null
    comparedRowCount?: number | null
    candidateOnlyRowCount?: number | null
    baselineOnlyRowCount?: number | null
    improvedTotalPnlPctRowCount?: number | null
    worsenedTotalPnlPctRowCount?: number | null
    candidateGoodRowCount?: number | null
    baselineGoodRowCount?: number | null
    candidateBadRowCount?: number | null
    baselineBadRowCount?: number | null
    medianTotalPnlPctDelta?: number | null
    medianTotalPnlUsdDelta?: number | null
    medianMaxDdPctDelta?: number | null
    medianMaxDdNoLiqPctDelta?: number | null
    medianFundingNetUsdDelta?: number | null
    improvedHadLiquidationRowCount?: number | null
    worsenedHadLiquidationRowCount?: number | null
    improvedRealLiquidationCountRowCount?: number | null
    worsenedRealLiquidationCountRowCount?: number | null
    improvedAccountRuinCountRowCount?: number | null
    worsenedAccountRuinCountRowCount?: number | null
    candidatePolicyMatrixReportId?: string | null
    baselinePolicyMatrixReportId?: string | null
    summaryReportId?: string | null
    policyRatiosReportId?: string | null
    baselineSummaryReportId?: string | null
    baselinePolicyRatiosReportId?: string | null
}

export interface ExperimentRegistrySnapshotDto {
    schemaVersion: string
    featureCatalog: ExperimentFeatureCatalogItemDto[]
    policyCatalog: BacktestPolicyCatalogDto
    scenarioCatalog: BacktestScenarioCatalogDto
    selectionPolicy: BacktestSelectionPolicyDto
    modelLayers: ModelLayerProfileDto[]
    policyLayers: PolicyLayerProfileDto[]
    bucketLayers: BucketLayerProfileDto[]
    bundles: ExperimentBundleDto[]
    activations: ExperimentActivationPointerDto[]
    activationHistory: ExperimentActivationHistoryEntryDto[]
    sandboxRuns: ExperimentSandboxRunDto[]
}

export interface ExperimentBundleCreateDto {
    name: string
    description?: string | null
    modelLayerId: string
    policyLayerId: string
    bucketLayerId: string
}

export interface ExperimentBundleStatusUpdateDto {
    status: ExperimentVariantStatus
    note?: string | null
}

export interface ExperimentActivationUpdateDto {
    bundleId: string
    note?: string | null
}

export interface ExperimentSandboxRunRequestDto {
    bundleId?: string
    modelLayerId?: string
    policyLayerId?: string
    bucketLayerId?: string
    tpSlMode?: 'all' | 'dynamic' | 'static'
}

export interface ExperimentSandboxRunResponseDto {
    run: ExperimentSandboxRunDto
    candidatePreview: BacktestPreviewBundleDto
    baselinePreview: BacktestPreviewBundleDto
    proof: ExperimentSandboxProofDto
}

export interface ExperimentSandboxProofSelectionDto {
    tpSlMode: string
    scenarioBlockKeys: string[]
}

export interface ExperimentSandboxProofRequestDto {
    runId: string
    scenarioBlockKeys?: string[]
}

export interface ExperimentSandboxVerdictCheckDto {
    checkKey: string
    label: string
    passed: boolean
    detail: string
}

export interface ExperimentSandboxTopRowDeltaDto {
    policy: string
    policyGroupKey: string
    scenarioBlockKey: string
    candidateTotalPnlPct?: number | null
    baselineTotalPnlPct?: number | null
    totalPnlPctDelta?: number | null
    candidateTotalPnlUsd?: number | null
    baselineTotalPnlUsd?: number | null
    totalPnlUsdDelta?: number | null
    candidateMaxDdPct?: number | null
    baselineMaxDdPct?: number | null
    maxDdPctDelta?: number | null
    candidateMaxDdNoLiqPct?: number | null
    baselineMaxDdNoLiqPct?: number | null
    maxDdNoLiqPctDelta?: number | null
    candidateFundingNetUsd?: number | null
    baselineFundingNetUsd?: number | null
    fundingNetUsdDelta?: number | null
    candidateRealLiquidationCount?: number | null
    baselineRealLiquidationCount?: number | null
    realLiquidationCountDelta?: number | null
    candidateAccountRuinCount?: number | null
    baselineAccountRuinCount?: number | null
    accountRuinCountDelta?: number | null
    candidateHadLiquidation?: boolean | null
    baselineHadLiquidation?: boolean | null
    candidateTrades?: number | null
    baselineTrades?: number | null
    tradesDelta?: number | null
    candidateStatus?: string | null
    baselineStatus?: string | null
}

export interface ExperimentSandboxComparisonRowDto {
    policyName: string
    policyGroupKey: string
    policyType: string
    marginMode: string
    scenarioBlockKey: string
    branchKey: string
    stopLossModeKey: string
    candidateMetrics: PolicyPerformanceMetricsDto
    baselineMetrics: PolicyPerformanceMetricsDto
    candidateEvaluation: PolicyEvaluationDto
    baselineEvaluation: PolicyEvaluationDto
    delta: ExperimentSandboxTopRowDeltaDto
}

export interface ExperimentSandboxVerdictDto {
    status: ExperimentSandboxVerdictStatus
    summary: string
    candidateRowCount: number
    baselineRowCount: number
    comparedRowCount: number
    candidateOnlyRowCount: number
    baselineOnlyRowCount: number
    improvedTotalPnlPctRowCount: number
    worsenedTotalPnlPctRowCount: number
    improvedMaxDdPctRowCount: number
    worsenedMaxDdPctRowCount: number
    candidateGoodRowCount: number
    baselineGoodRowCount: number
    candidateBadRowCount: number
    baselineBadRowCount: number
    medianTotalPnlPctDelta?: number | null
    medianTotalPnlUsdDelta?: number | null
    medianMaxDdPctDelta?: number | null
    medianMaxDdNoLiqPctDelta?: number | null
    medianFundingNetUsdDelta?: number | null
    improvedHadLiquidationRowCount?: number | null
    worsenedHadLiquidationRowCount?: number | null
    improvedRealLiquidationCountRowCount?: number | null
    worsenedRealLiquidationCountRowCount?: number | null
    improvedAccountRuinCountRowCount?: number | null
    worsenedAccountRuinCountRowCount?: number | null
    medianTradesDelta?: number | null
    bestImprovement?: ExperimentSandboxTopRowDeltaDto | null
    worstRegression?: ExperimentSandboxTopRowDeltaDto | null
    checks: ExperimentSandboxVerdictCheckDto[]
}

export interface ExperimentSandboxProofDto {
    runId: string
    selection: ExperimentSandboxProofSelectionDto
    candidateMatrix: BacktestPolicyScenarioMatrixDto
    baselineMatrix: BacktestPolicyScenarioMatrixDto
    rows: ExperimentSandboxComparisonRowDto[]
    verdict: ExperimentSandboxVerdictDto
}
