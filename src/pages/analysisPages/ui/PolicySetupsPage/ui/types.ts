import type { PolicySetupCandlesResponseDto, PolicySetupLedgerResponseDto } from '@/shared/types/policySetupHistory'

// Типы страницы лежат рядом с экраном, чтобы detail-view и chart-view читали один и тот же контракт detail-слоёв.
export type RangePreset = 'all' | '30d' | '90d' | '365d' | '730d'
export type BalanceViewMode = 'pane' | 'overlay'
export type LineVisibilityMode = 'subtle' | 'strong'

export interface PolicySetupChartVisibleRange {
    from: number
    to: number
}

export interface PolicySetupsChartProps {
    ledger: PolicySetupLedgerResponseDto
    candlesResponse: PolicySetupCandlesResponseDto
    balanceView: BalanceViewMode
    showCandles: boolean
    showDayBoundaries: boolean
    showStopLoss: boolean
    showTakeProfit: boolean
    showLiquidations: boolean
    hideNoTradeDays: boolean
    lineVisibilityMode: LineVisibilityMode
    viewportResetKey: string
    onVisibleRangeChange?: (range: PolicySetupChartVisibleRange | null) => void
}
