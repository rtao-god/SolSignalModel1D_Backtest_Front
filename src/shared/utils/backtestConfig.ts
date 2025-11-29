import type { BacktestConfigDto } from '@/shared/types/backtest.types'

/**
 * Клонирует BacktestConfigDto, чтобы не мутировать исходный config профиля.
 */
export function cloneBacktestConfig(config: BacktestConfigDto): BacktestConfigDto {
    return {
        dailyStopPct: config.dailyStopPct,
        dailyTpPct: config.dailyTpPct,
        policies: config.policies.map(p => ({ ...p }))
    }
}
