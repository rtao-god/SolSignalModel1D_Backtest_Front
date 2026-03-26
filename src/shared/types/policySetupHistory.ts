export type PolicySetupHistoryResolution = '1m' | '3h' | '6h'
export type PolicySetupHistoryPublishedState = 'fresh' | 'stale' | 'missing' | 'building' | 'failed'

export interface PolicySetupNoTradeReasonDto {
    code: string
    label: string
    details: string
}

export interface PolicySetupCatalogItemDto {
    setupId: string
    displayLabel: string
    policyName: string
    marginMode: string
    branch: string
    bucket: string
    useStopLoss: boolean
    useAntiDirectionOverlay: boolean
    tpSlMode: 'all' | 'dynamic' | 'static'
    zonalMode: 'with-zonal' | 'without-zonal'
    tradesCount: number
    noTradeDaysCount: number
    totalPnlPct: number
    maxDrawdownPct: number
    hadLiquidation: boolean
    fromDateUtc: string
    toDateUtc: string
}

export interface PolicySetupDateRangeDto {
    fromDateUtc: string
    toDateUtc: string
}

export interface PolicySetupCandleRangeDto {
    fromDateUtc: string
    toDateUtc: string
    resolution: PolicySetupHistoryResolution
}

export interface PolicySetupHistoryCandleDto {
    openTimeUtc: string
    open: number
    high: number
    low: number
    close: number
}

export interface PolicySetupCapitalTimelinePointDto {
    timeUtc: string
    valueUsd: number | null
}

export interface PolicySetupCapitalTimelineDto {
    startCapitalUsd: number
    hasWorkingCapitalGap: boolean
    firstWorkingCapitalGapDayUtc: string | null
    latestTotalCapitalUsd: number
    latestWorkingCapitalUsd: number
    totalCapitalBaseSeries: PolicySetupCapitalTimelinePointDto[]
    totalCapitalProfitSeries: PolicySetupCapitalTimelinePointDto[]
    workingCapitalGapSeries: PolicySetupCapitalTimelinePointDto[]
}

export interface PolicySetupHistoryDayDto {
    tradingDayUtc: string
    dayBlockStartUtc: string
    dayBlockEndUtc: string
    hasTrade: boolean
    noTradeReason: string | null
    noTradeDecision: PolicySetupNoTradeReasonDto | null
    forecastDirection: 'up' | 'down' | null
    forecastLabel: string | null
    direction: 'long' | 'short' | null
    entryTimeUtc: string | null
    exitTimeUtc: string | null
    entryPrice: number | null
    exitPrice: number | null
    exitReason: string | null
    exitPnlPct: number | null
    leverage: number | null
    stopLossPrice: number | null
    stopLossPct: number | null
    takeProfitPrice: number | null
    takeProfitPct: number | null
    liquidationPrice: number | null
    liquidationDistancePct: number | null
    triggeredStopLoss: boolean
    triggeredTakeProfit: boolean
    triggeredLiquidation: boolean
    triggeredEndOfDay: boolean
    balanceBeforeUsd: number
    balanceAfterUsd: number
    withdrawnBeforeUsd: number
    withdrawnAfterUsd: number
    visibleBalanceBeforeUsd: number
    visibleBalanceAfterUsd: number
    bucketCapitalBeforeUsd: number | null
    stakeUsd: number | null
    stakePct: number | null
    notionalUsd: number | null
    positionQty: number | null
}

export interface PolicySetupLedgerResponseDto {
    setup: PolicySetupCatalogItemDto
    availableRange: PolicySetupDateRangeDto
    appliedRange: PolicySetupDateRangeDto
    availableResolutions: PolicySetupHistoryResolution[]
    startCapitalUsd: number
    balanceCeilingUsd: number
    visibleBalanceCeilingUsd: number
    capitalTimeline: PolicySetupCapitalTimelineDto
    days: PolicySetupHistoryDayDto[]
}

export interface PolicySetupCandlesResponseDto {
    setupId: string
    availableRange: PolicySetupDateRangeDto
    appliedRange: PolicySetupCandleRangeDto
    candles: PolicySetupHistoryCandleDto[]
}

export interface PolicySetupHistoryPublishedStatusDto {
    state: PolicySetupHistoryPublishedState
    message: string
    canServePublished: boolean
    publishedGeneratedAtUtc: string | null
    publishedSetupCount: number | null
    lastRebuildStartedAtUtc: string | null
    lastRebuildCompletedAtUtc: string | null
    lastRebuildFailedAtUtc: string | null
    lastRebuildFailureMessage: string | null
}
