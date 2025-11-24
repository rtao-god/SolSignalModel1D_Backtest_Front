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
 * Если потом появится более спец. DTO — можно будет расширить.
 */
export type BacktestSummaryDto = ReportDocumentDto

/**
 * Краткая сводка по одной политике в baseline-снимке.
 * Повторяет BacktestPolicySummary с бэка.
 */
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

/**
 * Baseline-снимок бэктеста:
 * - лёгкий объект без сырых трейдов;
 * - хранится и отдается через /api/backtest/baseline.
 */
export interface BacktestBaselineSnapshotDto {
    id: string
    generatedAtUtc: string
    configName: string
    dailyStopPct: number
    dailyTpPct: number
    policies: BacktestPolicySummaryDto[]
}
