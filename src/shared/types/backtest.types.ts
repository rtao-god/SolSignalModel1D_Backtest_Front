import type { ReportDocumentDto } from './report.types'

export interface BacktestPolicyConfigDto {
    name: string
    policyType: string // 'const' | 'risk_aware' | 'ultra_safe' | etc.
    leverage?: number | null // Для const-политик, может быть null.
    marginMode: string // 'Cross' | 'Isolated'.
}

export interface BacktestConfigDto {
    dailyStopPct: number
    dailyTpPct: number
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
    marginMode: string // 'Cross' | 'Isolated'.
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

export interface BacktestPreviewRequestDto {
    config?: BacktestConfigDto
    selectedPolicies?: string[]
}

export type BacktestSummaryDto = ReportDocumentDto

