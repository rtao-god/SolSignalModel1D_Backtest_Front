export type PolicyEvaluationStatus = 'good' | 'caution' | 'bad' | 'unknown'

export interface PolicyEvaluationReasonDto {
    code: string
    message: string
}

export interface PolicyEvaluationThresholdsDto {
    maxDrawdownPct: number
    minTradesCount: number
    minCalmar: number
    minSortino: number
}

export interface PolicyEvaluationMetricsDto {
    marginMode: string | null
    totalPnlPct: number | null
    maxDdPct: number | null
    maxDdNoLiqPct: number | null
    effectiveMaxDdPct: number | null
    hadLiquidation: boolean | null
    realLiquidationCount: number | null
    accountRuinCount: number | null
    balanceDead: boolean | null
    tradesCount: number | null
    calmar: number | null
    sortino: number | null
}

export interface PolicyEvaluationDto {
    profileId: string
    status: PolicyEvaluationStatus
    reasons: PolicyEvaluationReasonDto[]
    thresholds: PolicyEvaluationThresholdsDto | null
    metrics: PolicyEvaluationMetricsDto
}

export interface PolicyRowEvaluationMapDto {
    profileId: string
    rows: Record<string, PolicyEvaluationDto>
}
