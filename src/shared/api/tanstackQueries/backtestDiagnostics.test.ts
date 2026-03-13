import { BACKTEST_DIAGNOSTICS_QUERY_SCOPES, buildBacktestDiagnosticsQueryKey } from './backtestDiagnostics'

describe('backtestDiagnostics query key', () => {
    test('isolates diagnostics cache by owner scope', () => {
        const args = {
            bucket: 'daily',
            tpSlMode: 'dynamic',
            slMode: 'with-sl',
            zonalMode: 'with-zonal'
        }

        const backtestPageKey = buildBacktestDiagnosticsQueryKey(args, BACKTEST_DIAGNOSTICS_QUERY_SCOPES.backtestPage)
        const hotspotsPageKey = buildBacktestDiagnosticsQueryKey(args, BACKTEST_DIAGNOSTICS_QUERY_SCOPES.hotspotsPage)
        const sidebarNavKey = buildBacktestDiagnosticsQueryKey(args, BACKTEST_DIAGNOSTICS_QUERY_SCOPES.sidebarNav)

        expect(backtestPageKey).not.toEqual(hotspotsPageKey)
        expect(backtestPageKey).not.toEqual(sidebarNavKey)
        expect(hotspotsPageKey).not.toEqual(sidebarNavKey)
    })

    test('keeps the same key for the same diagnostics owner scope', () => {
        const args = {
            bucket: 'daily',
            tpSlMode: 'dynamic',
            slMode: 'with-sl',
            zonalMode: 'with-zonal'
        }

        expect(buildBacktestDiagnosticsQueryKey(args, BACKTEST_DIAGNOSTICS_QUERY_SCOPES.guardrailPage)).toEqual(
            buildBacktestDiagnosticsQueryKey(args, BACKTEST_DIAGNOSTICS_QUERY_SCOPES.guardrailPage)
        )
    })
})
