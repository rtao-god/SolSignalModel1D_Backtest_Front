
export interface PolicyRatiosPerPolicyDto {
    policyName: string
    bucket: string
    tradesCount: number
    totalPnlPct: number
    maxDdPct: number
    mean: number
    std: number
    downStd: number
    sharpe: number
    sortino: number
    cagr: number
    calmar: number
    winRatePct: number
    withdrawnUsd: number
    hadLiquidation: boolean
}

export interface PolicyRatiosReportDto {
    backtestId: string
    fromDateUtc: string | null
    toDateUtc: string | null
    policies: PolicyRatiosPerPolicyDto[]
}
