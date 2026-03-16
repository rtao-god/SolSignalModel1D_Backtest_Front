import {
    buildBacktestDiagnosticsQueryArgs,
    buildBacktestDiagnosticsQueryArgsFromSearchParams,
    DEFAULT_BACKTEST_DIAGNOSTICS_SELECTION,
    DEFAULT_DIAGNOSTICS_BUCKET_MODE,
    DEFAULT_DIAGNOSTICS_SL_MODE,
    DEFAULT_DIAGNOSTICS_TP_SL_MODE,
    DEFAULT_DIAGNOSTICS_ZONAL_MODE,
    resolveBacktestDiagnosticsSearchSelection
} from './backtestDiagnosticsQuery'

describe('backtestDiagnosticsQuery', () => {
    test('keeps daily bucket as the shared diagnostics default', () => {
        expect(DEFAULT_DIAGNOSTICS_BUCKET_MODE).toBe('daily')
    })

    test('uses diagnostics defaults when search is empty', () => {
        const searchParams = new URLSearchParams('')

        expect(resolveBacktestDiagnosticsSearchSelection(searchParams)).toEqual({
            bucket: DEFAULT_DIAGNOSTICS_BUCKET_MODE,
            slMode: DEFAULT_DIAGNOSTICS_SL_MODE,
            tpSlMode: DEFAULT_DIAGNOSTICS_TP_SL_MODE,
            zonalMode: DEFAULT_DIAGNOSTICS_ZONAL_MODE
        })
    })

    test('builds tanstack query args from diagnostics search params', () => {
        const searchParams = new URLSearchParams('bucket=daily&slmode=no-sl&tpsl=dynamic&zonal=without-zonal')

        expect(buildBacktestDiagnosticsQueryArgsFromSearchParams(searchParams)).toEqual({
            bucket: 'daily',
            slMode: 'no-sl',
            tpSlMode: 'dynamic',
            zonalMode: 'without-zonal'
        })
    })

    test('builds tanstack query args from resolved diagnostics selection', () => {
        expect(buildBacktestDiagnosticsQueryArgs(DEFAULT_BACKTEST_DIAGNOSTICS_SELECTION)).toEqual({
            bucket: 'daily',
            slMode: 'all',
            tpSlMode: 'all',
            zonalMode: 'with-zonal'
        })
    })
})
