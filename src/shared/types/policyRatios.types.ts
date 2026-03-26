import type { PolicyEvaluationDto } from './policyEvaluation.types'

export interface PolicyRatiosPerPolicyDto {
    policyName: string
    bucket: string
    tradesCount: number
    marginMode: string | null
    totalPnlPct: number
    maxDdPct: number
    maxDdNoLiqPct: number | null
    mean: number
    std: number
    downStd: number
    sharpe: number
    sortino: number
    cagr: number
    calmar: number
    winRatePct: number
    withdrawnUsd: number
    accountRuinCount: number | null
    hadLiquidation: boolean
    evaluation: PolicyEvaluationDto | null
}

export interface PolicyRatiosReportDto {
    backtestId: string
    fromDateUtc: string | null
    toDateUtc: string | null
    policies: PolicyRatiosPerPolicyDto[]
}
