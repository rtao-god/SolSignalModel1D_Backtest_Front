export type BacktestDiagnosticsControlAxis = 'tpSlMode' | 'mode' | 'bucket' | 'zonalMode'

export const BACKTEST_DIAGNOSTICS_FULL_CONTROL_AXES: readonly BacktestDiagnosticsControlAxis[] = [
    'tpSlMode',
    'mode',
    'bucket',
    'zonalMode'
]

export const BACKTEST_DIAGNOSTICS_NO_BUCKET_CONTROL_AXES: readonly BacktestDiagnosticsControlAxis[] = [
    'tpSlMode',
    'mode',
    'zonalMode'
]
