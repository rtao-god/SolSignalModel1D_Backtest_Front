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
                    columnKeys: ['policy'],
                    columnDescriptors: [
                        {
                            columnKey: 'policy',
                            displayLabel: 'Policy',
                            termKey: 'Policy'
                        }
                    ],
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

    test('fails fast when diagnostics report does not publish owner column descriptors', () => {
        expect(() =>
            mapReportResponse({
                schemaVersion: 1,
                id: 'diag-report-missing-descriptors',
                kind: 'backtest_diagnostics',
                title: 'Diagnostics report',
                generatedAtUtc: '2026-04-05T10:00:00.000Z',
                tableSections: [
                    {
                        title: 'Guardrail table',
                        columns: ['Policy'],
                        columnKeys: ['policy'],
                        rows: [['Baseline']]
                    }
                ]
            })
        ).toThrow(/columnDescriptors/)
    })

    test('fails fast when any report table does not publish owner column descriptors', () => {
        expect(() =>
            mapReportResponse({
                schemaVersion: 1,
                id: 'model-stats-report-missing-descriptors',
                kind: 'backtest_model_stats',
                title: 'Model stats report',
                generatedAtUtc: '2026-04-05T10:00:00.000Z',
                tableSections: [
                    {
                        title: 'Models overview',
                        columns: ['Model'],
                        columnKeys: ['model'],
                        rows: [['Move']]
                    }
                ]
            })
        ).toThrow(/report_column_registry/)
    })

    test('maps non-diagnostics table column registry from backend descriptors', () => {
        const report = mapReportResponse({
            schemaVersion: 1,
            id: 'model-stats-report',
            kind: 'backtest_model_stats',
            title: 'Model stats report',
            generatedAtUtc: '2026-04-05T10:00:00.000Z',
            tableSections: [
                {
                    title: 'Models overview',
                    columns: ['Model'],
                    columnKeys: ['model'],
                    columnDescriptors: [
                        {
                            columnKey: 'model',
                            displayLabel: 'Model',
                            termKey: 'Model'
                        }
                    ],
                    rows: [['Move']]
                }
            ]
        })

        expect(report.sections[0]?.columnDescriptors).toEqual([
            {
                columnKey: 'model',
                displayLabel: 'Model',
                termKey: 'Model'
            }
        ])
    })
})
