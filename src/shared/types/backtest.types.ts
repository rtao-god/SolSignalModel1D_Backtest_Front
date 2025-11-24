import type { ReportDocumentDto } from './report.types'

/**
 * Конфиг одной политики плеча в бэктесте.
 * Это прямая проекция PolicyConfig из бэка.
 */
export interface BacktestPolicyConfigDto {
    name: string
    policyType: string // 'const' | 'risk_aware' | 'ultra_safe' | etc.
    leverage?: number | null // для const-политик, может быть null
    marginMode: string // 'Cross' | 'Isolated'
}

/**
 * Общий конфиг бэктеста.
 * Доли SL/TP — в долях (0.05 = 5%).
 */
export interface BacktestConfigDto {
    dailyStopPct: number
    dailyTpPct: number
    policies: BacktestPolicyConfigDto[]
}

/**
 * Профиль бэктеста.
 * Оборачивает BacktestConfigDto + метаданные.
 */
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


/**
 * Лёгкая сводка по одной политике в baseline-снимке.
 */
export interface BacktestPolicySummaryDto {
    policyName: string
    marginMode: string // 'Cross' | 'Isolated'
    useAntiDirectionOverlay: boolean

    totalPnlPct: number
    maxDrawdownPct: number
    hadLiquidation: boolean
    withdrawnTotal: number

    tradesCount: number
}

/**
 * Лёгкий baseline-снимок бэктеста (DTO под /api/backtest/baseline).
 */
export interface BacktestBaselineSnapshotDto {
    id: string
    generatedAtUtc: string
    configName: string

    dailyStopPct: number
    dailyTpPct: number

    policies: BacktestPolicySummaryDto[]
}

/**
 * DTO для one-shot preview.
 * Соответствует BacktestPreviewRequestDto на бэке:
 * - config: конфиг бэктеста;
 * - selectedPolicies: имена политик, которые нужно прогонять.
 */
export interface BacktestPreviewRequestDto {
    config?: BacktestConfigDto
    selectedPolicies?: string[]
}

/**
 * Сводка бэктеста с точки зрения фронта.
 * Сейчас это просто ReportDocumentDto (keyValue + таблицы).
 */
export type BacktestSummaryDto = ReportDocumentDto
