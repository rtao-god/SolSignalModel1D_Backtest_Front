import type { PolicyRatiosReportDto } from './policyRatios.types'
import type { ReportDocumentDto } from './report.types'

export interface BacktestPolicyConfigDto {
    name: string
    policyType: string
    leverage?: number | null
    marginMode: string
}

export interface BacktestConfidenceRiskConfigDto {
    enabled: boolean
    source: string

    bucketStartInclusive: number
    bucketWidth: number
    bucketCount: number

    confMin: number
    confMax: number

    capMultiplierMin: number
    capMultiplierMax: number
    tpMultiplierMin: number
    tpMultiplierMax: number
    slMultiplierMin: number
    slMultiplierMax: number

    capFractionMin: number
    capFractionMax: number
    dailyTpPctMin: number
    dailyTpPctMax: number
    dailySlPctMin: number
    dailySlPctMax: number

    applyToDynamicPolicies: boolean

    confGateMin: number
    confGateRiskDayMin: number
    confidenceHighZoneMin: number
    confidenceMidZoneMin: number
    confidenceRiskDayHighZoneMin: number
    confidenceRiskDayMidZoneMin: number
    midZoneLeverageScale: number
    midZoneCapScale: number
    midZoneLeverageCap: number
    midZoneCapMax: number
    lowZoneLeverageScale: number
    lowZoneCapScale: number
    lowZoneLeverageCap: number
    lowZoneCapMax: number

    coverageWindowDays: number
    coverageControlMinSamples: number
    coverageTargetMin: number
    coverageTargetMax: number
    coverageQualityMinWinRate: number
    coverageThresholdStep: number
    coverageMaxAdjustmentSteps: number

    confidenceEvidenceMinBucketSamples: number
    confidenceEvidenceMinBucketWinRate: number
    outOfRangeBehavior: string
}

export interface BacktestRiskBudgetTierDto {
    name: string
    leverageMinInclusive: number
    leverageMaxInclusive: number
    riskBudgetPct: number
}

export interface BacktestRiskBudgetConfigDto {
    enabled: boolean
    riskDayBudgetMultiplier: number
    riskDayLeverageMax: number
    minRiskBudgetPct: number
    tiers: BacktestRiskBudgetTierDto[]
}

export interface BacktestConfigDto {
    dailyStopPct: number
    dailyTpPct: number
    confidenceRisk?: BacktestConfidenceRiskConfigDto | null
    riskBudget?: BacktestRiskBudgetConfigDto | null
    reportBucketPolicy?: string
    policies: BacktestPolicyConfigDto[]
}

export type BacktestProfileCategory = 'system' | 'user' | 'scratch' | string

export interface BacktestProfileDto {
    id: string
    name: string
    description?: string | null
    isSystem: boolean
    category?: BacktestProfileCategory
    isFavorite?: boolean
    config: BacktestConfigDto | null
}

export interface BacktestProfileCreateDto {
    name: string
    description?: string | null
    category?: BacktestProfileCategory
    isFavorite?: boolean
    config: BacktestConfigDto
}

export interface BacktestProfileUpdateDto {
    name?: string
    category?: BacktestProfileCategory
    isFavorite?: boolean
}

export interface BacktestPolicySummaryDto {
    policyName: string
    marginMode: string
    useAntiDirectionOverlay: boolean
    totalPnlPct: number
    maxDrawdownPct: number
    hadLiquidation: boolean
    withdrawnTotal: number
    tradesCount: number
}

export interface BacktestBaselineSnapshotDto {
    id: string
    generatedAtUtc: string
    configName: string
    dailyStopPct: number
    dailyTpPct: number
    policies: BacktestPolicySummaryDto[]
}

export type BacktestTpSlMode = 'all' | 'dynamic' | 'static'

export interface BacktestPreviewRequestDto {
    config: BacktestConfigDto
    tpSlMode?: BacktestTpSlMode
    selectedPolicies?: string[]
}

export interface BacktestPreviewBundleDto {
    summary: BacktestSummaryDto
    policyRatios: PolicyRatiosReportDto
}

export interface BacktestCompareRequestDto {
    leftProfileId: string
    rightProfileId: string
    tpSlMode?: BacktestTpSlMode
}

export interface BacktestCompareSideDto {
    profileId: string
    profileName: string
    preview: BacktestPreviewBundleDto
}

export interface BacktestCompareDeltaDto {
    bestTotalPnlPctDelta: number
    worstMaxDdPctDelta: number
    totalTradesDelta: number
}

export interface BacktestCompareResponseDto {
    left: BacktestCompareSideDto
    right: BacktestCompareSideDto
    delta: BacktestCompareDeltaDto
}

export type BacktestSummaryDto = ReportDocumentDto
