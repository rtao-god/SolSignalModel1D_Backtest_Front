import type { PolicyEvaluationDto } from './policyEvaluation.types'
import type { PolicyPerformanceMetricsDto } from './policyPerformanceMetrics.types'

export interface PolicyRatiosPerPolicyDto {
    policyName: string
    bucket: string
    marginMode: string | null
    performanceMetrics: PolicyPerformanceMetricsDto
    evaluation: PolicyEvaluationDto | null
}

export interface PolicyRatiosReportDto {
    backtestId: string
    fromDateUtc: string | null
    toDateUtc: string | null
    policies: PolicyRatiosPerPolicyDto[]
}
