import type { TableSectionDto } from '@/shared/types/report.types'
import { buildPolicyBranchMegaChartModel } from './policyBranchMegaChartModel'

describe('buildPolicyBranchMegaChartModel', () => {
    test('parses spaced composite mega columns including MaxDD active depth and duration', () => {
        const sections: TableSectionDto[] = [
            {
                title: '=== Policy Branch Mega (WITH SL) [PART 1/4] ===',
                columns: [
                    'Policy',
                    'Branch',
                    'SL Mode',
                    'TotalPnl%',
                    'MaxDD_Active% / Days',
                    'Lev p50 / p90',
                    'Exposure% (avg / p50 / p90 / p99 / max)'
                ],
                rows: [
                    [
                        'const_20x',
                        'BASE',
                        'WITH SL',
                        '12.50',
                        '42.70 / 181',
                        '10 / 16',
                        '7.50 / 9.00 / 15.00 / 22.00 / 28.00'
                    ]
                ]
            }
        ]

        const model = buildPolicyBranchMegaChartModel(sections)
        const row = model.rows[0]

        expect(row).toBeDefined()
        expect(row.numericValues['MaxDD_Active% / Days::pct']).toBeCloseTo(42.7)
        expect(row.numericValues['MaxDD_Active% / Days::days']).toBeCloseTo(181)
        expect(row.numericValues['Lev p50 / p90::p50']).toBeCloseTo(10)
        expect(row.numericValues['Lev p50 / p90::p90']).toBeCloseTo(16)
        expect(row.numericValues['Exposure% (avg / p50 / p90 / p99 / max)::p99']).toBeCloseTo(22)
        expect(model.metrics.find(metric => metric.key === 'MaxDD_Active% / Days::days')?.kind).toBe('count')
    })
})
