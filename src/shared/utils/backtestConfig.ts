import type {
    BacktestConfigDto,
    BacktestConfidenceRiskConfigDto,
    BacktestRiskBudgetConfigDto,
    BacktestRiskBudgetTierDto
} from '@/shared/types/backtest.types'

function cloneRiskBudgetTier(tier: BacktestRiskBudgetTierDto): BacktestRiskBudgetTierDto {
    return {
        name: tier.name,
        leverageMinInclusive: tier.leverageMinInclusive,
        leverageMaxInclusive: tier.leverageMaxInclusive,
        riskBudgetPct: tier.riskBudgetPct
    }
}

function cloneRiskBudgetConfig(config: BacktestRiskBudgetConfigDto): BacktestRiskBudgetConfigDto {
    return {
        enabled: config.enabled,
        riskDayBudgetMultiplier: config.riskDayBudgetMultiplier,
        riskDayLeverageMax: config.riskDayLeverageMax,
        minRiskBudgetPct: config.minRiskBudgetPct,
        tiers: config.tiers.map(cloneRiskBudgetTier)
    }
}

function cloneConfidenceRiskConfig(config: BacktestConfidenceRiskConfigDto): BacktestConfidenceRiskConfigDto {
    return {
        enabled: config.enabled,
        source: config.source,
        bucketStartInclusive: config.bucketStartInclusive,
        bucketWidth: config.bucketWidth,
        bucketCount: config.bucketCount,
        confMin: config.confMin,
        confMax: config.confMax,
        capMultiplierMin: config.capMultiplierMin,
        capMultiplierMax: config.capMultiplierMax,
        tpMultiplierMin: config.tpMultiplierMin,
        tpMultiplierMax: config.tpMultiplierMax,
        slMultiplierMin: config.slMultiplierMin,
        slMultiplierMax: config.slMultiplierMax,
        capFractionMin: config.capFractionMin,
        capFractionMax: config.capFractionMax,
        dailyTpPctMin: config.dailyTpPctMin,
        dailyTpPctMax: config.dailyTpPctMax,
        dailySlPctMin: config.dailySlPctMin,
        dailySlPctMax: config.dailySlPctMax,
        applyToDynamicPolicies: config.applyToDynamicPolicies,
        confGateMin: config.confGateMin,
        confGateRiskDayMin: config.confGateRiskDayMin,
        confidenceHighZoneMin: config.confidenceHighZoneMin,
        confidenceMidZoneMin: config.confidenceMidZoneMin,
        confidenceRiskDayHighZoneMin: config.confidenceRiskDayHighZoneMin,
        confidenceRiskDayMidZoneMin: config.confidenceRiskDayMidZoneMin,
        midZoneLeverageScale: config.midZoneLeverageScale,
        midZoneCapScale: config.midZoneCapScale,
        midZoneLeverageCap: config.midZoneLeverageCap,
        midZoneCapMax: config.midZoneCapMax,
        lowZoneLeverageScale: config.lowZoneLeverageScale,
        lowZoneCapScale: config.lowZoneCapScale,
        lowZoneLeverageCap: config.lowZoneLeverageCap,
        lowZoneCapMax: config.lowZoneCapMax,
        coverageWindowDays: config.coverageWindowDays,
        coverageControlMinSamples: config.coverageControlMinSamples,
        coverageTargetMin: config.coverageTargetMin,
        coverageTargetMax: config.coverageTargetMax,
        coverageQualityMinWinRate: config.coverageQualityMinWinRate,
        coverageThresholdStep: config.coverageThresholdStep,
        coverageMaxAdjustmentSteps: config.coverageMaxAdjustmentSteps,
        confidenceEvidenceMinBucketSamples: config.confidenceEvidenceMinBucketSamples,
        confidenceEvidenceMinBucketWinRate: config.confidenceEvidenceMinBucketWinRate,
        outOfRangeBehavior: config.outOfRangeBehavior
    }
}

export function cloneBacktestConfig(config: BacktestConfigDto): BacktestConfigDto {
    return {
        dailyStopPct: config.dailyStopPct,
        dailyTpPct: config.dailyTpPct,
        confidenceRisk: config.confidenceRisk ? cloneConfidenceRiskConfig(config.confidenceRisk) : null,
        riskBudget: config.riskBudget ? cloneRiskBudgetConfig(config.riskBudget) : null,
        reportBucketPolicy: config.reportBucketPolicy,
        policies: config.policies.map(p => ({ ...p }))
    }
}

