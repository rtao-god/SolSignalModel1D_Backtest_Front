import { mapReportResponse } from './mapReportResponse'

describe('mapReportResponse', () => {
    test('normalizes PascalCase diagnostics metadata enums to canonical UI values', () => {
        const report = mapReportResponse({
            schemaVersion: 1,
            id: 'diag-report',
            kind: 'backtest_diagnostics',
            title: 'Diagnostics report',
            generatedAtUtc: '2026-04-05T10:00:00.000Z',
            tableSections: [
                {
                    title: 'Guardrail table',
                    columns: ['Policy'],
                    rows: [['Baseline']],
                    metadata: {
                        kind: 'PolicyBranchMega',
                        historySlice: 'FullHistory',
                        mode: 'WithSl',
                        tpSlMode: 'Dynamic',
                        zonalMode: 'WithZonal',
                        metricVariant: 'NoBiggestLiqLoss',
                        bucket: 'TotalAggregate',
                        part: 1
                    }
                }
            ]
        })

        expect(report.sections).toHaveLength(1)
        expect(report.sections[0]?.metadata).toEqual({
            kind: 'policy-branch-mega',
            historySlice: 'full_history',
            mode: 'with-sl',
            tpSlMode: 'dynamic',
            zonalMode: 'with-zonal',
            metricVariant: 'no-biggest-liq-loss',
            bucket: 'total-aggregate',
            part: 1
        })
    })
})
