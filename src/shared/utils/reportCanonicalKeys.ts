export const CURRENT_PREDICTION_POLICY_COLUMN_KEYS = {
    policy: 'policy',
    branch: 'branch',
    bucket: 'bucket',
    hasDirection: 'has_direction',
    skipped: 'skipped',
    direction: 'direction',
    leverage: 'leverage',
    entryPrice: 'entry_price',
    slPct: 'sl_pct',
    tpPct: 'tp_pct',
    slPrice: 'sl_price',
    tpPrice: 'tp_price',
    notionalUsd: 'notional_usd',
    liqPrice: 'liq_price',
    exitPrice: 'exit_price',
    exitReason: 'exit_reason',
    bucketCapitalUsd: 'bucket_capital_usd',
    stakeUsd: 'stake_usd',
    stakePct: 'stake_pct'
} as const

export type CurrentPredictionPolicyColumnKey =
    (typeof CURRENT_PREDICTION_POLICY_COLUMN_KEYS)[keyof typeof CURRENT_PREDICTION_POLICY_COLUMN_KEYS]
