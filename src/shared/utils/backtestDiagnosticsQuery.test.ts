import {
    buildBacktestDiagnosticsQueryArgsFromSearchParams,
    DEFAULT_DIAGNOSTICS_BUCKET_MODE,
    DEFAULT_DIAGNOSTICS_SL_MODE,
    DEFAULT_DIAGNOSTICS_TP_SL_MODE,
    DEFAULT_DIAGNOSTICS_ZONAL_MODE,
    resolveBacktestDiagnosticsSearchSelectionOrThrow
} from './backtestDiagnosticsQuery'

describe('backtestDiagnosticsQuery', () => {
    test('uses diagnostics defaults when search is empty', () => {
        const searchParams = new URLSearchParams('')

        expect(resolveBacktestDiagnosticsSearchSelectionOrThrow(searchParams)).toEqual({
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
})
