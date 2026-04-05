import type {
    BacktestConfigDto,
    BacktestConfidenceRiskConfigDto,
    BacktestRiskBudgetConfigDto,
    BacktestRiskBudgetTierDto,
    ExecutionProfileConfigDto,
    TradeExitGridDto,
    TradeExitGridLevelDto,
    TradeExitProfileDto
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

function cloneTradeExitProfile(profile: TradeExitProfileDto): TradeExitProfileDto {
    return {
        takeProfitPct: profile.takeProfitPct,
        stopLossPct: profile.stopLossPct
    }
}

function cloneTradeExitGridLevel(level: TradeExitGridLevelDto): TradeExitGridLevelDto {
    return {
        id: level.id,
        name: level.name,
        profile: cloneTradeExitProfile(level.profile)
    }
}

function cloneTradeExitGrid(grid: TradeExitGridDto): TradeExitGridDto {
    return {
        id: grid.id,
        name: grid.name,
        defaultLevelId: grid.defaultLevelId ?? null,
        levels: grid.levels.map(cloneTradeExitGridLevel)
    }
}

function cloneExecutionProfile(config: ExecutionProfileConfigDto): ExecutionProfileConfigDto {
    return {
        baselineProfile: cloneTradeExitProfile(config.baselineProfile),
        grid: cloneTradeExitGrid(config.grid),
        confidenceRisk: config.confidenceRisk ? cloneConfidenceRiskConfig(config.confidenceRisk) : null
    }
}

export function cloneBacktestConfig(config: BacktestConfigDto): BacktestConfigDto {
    return {
        calcMode: config.calcMode,
        executionProfile: cloneExecutionProfile(config.executionProfile),
        riskBudget: config.riskBudget ? cloneRiskBudgetConfig(config.riskBudget) : null,
        reportBucketPolicy: config.reportBucketPolicy,
        policies: config.policies.map(p => ({ ...p })),
        trainUntilExitDayKeyUtc: config.trainUntilExitDayKeyUtc ?? null,
        exportDiagnosticsCsv: config.exportDiagnosticsCsv ?? false,
        diagnosticsExportDir: config.diagnosticsExportDir ?? null,
        diagnosticsTopTradesCount: config.diagnosticsTopTradesCount ?? 0
    }
}
