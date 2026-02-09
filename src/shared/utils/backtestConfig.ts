import type { BacktestConfigDto } from '@/shared/types/backtest.types'
export function cloneBacktestConfig(config: BacktestConfigDto): BacktestConfigDto {
    return {
        dailyStopPct: config.dailyStopPct,
        dailyTpPct: config.dailyTpPct,
        policies: config.policies.map(p => ({ ...p }))
    }
}

