import type { TableSectionDto } from '@/shared/types/report.types'
import { buildPolicyBranchMegaRowKey } from '@/shared/utils/policyBranchMegaRowKey'
import {
    buildMainDemoPolicyBranchMegaSections,
    resolveMainDemoBestPolicyRows
} from './mainBestPolicySectionModel'

describe('mainBestPolicySectionModel', () => {
    function createMoneyMetricsRows(entries: Array<{ policy: string; branch: string; totalPnlPct: number }>) {
        return Object.fromEntries(
            entries.map(entry => [
                buildPolicyBranchMegaRowKey(entry.policy, entry.branch, null),
                {
                    totalPnlPct: entry.totalPnlPct,
                    totalPnlUsd: entry.totalPnlPct * 1000,
                    startCapitalUsd: 20000,
                    equityNowUsd: 25000,
                    withdrawnTotalUsd: 15000,
                    tradesCount: 7,
                    maxDdPct: 6.76,
                    sharpe: 1.18,
                    winRate: 0.542,
                    hadLiquidation: false,
                    accountRuinCount: 0
                }
            ])
        )
    }

    test('uses owner-provided TotalPnl% before resolving the anchor policy row', () => {
        const sections: TableSectionDto[] = [
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 1/4]',
                columns: ['Policy', 'Branch', 'TotalPnl%', 'TradesCount'],
                rows: [
                    ['const_2x', 'BASE', '12.50', '4'],
                    ['const_3x', 'BASE', '25.00', '7']
                ]
            },
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 2/4]',
                columns: ['Policy', 'Branch', 'EquityNowUsd', 'StartCapitalUsd'],
                rows: [
                    ['const_2x', 'BASE', '20000', '20000'],
                    ['const_3x', 'BASE', '20000', '20000']
                ]
            }
        ]

        const preparedSections = buildMainDemoPolicyBranchMegaSections(sections)
        const bestPolicy = resolveMainDemoBestPolicyRows(
            preparedSections,
            createMoneyMetricsRows([
                { policy: 'const_2x', branch: 'BASE', totalPnlPct: 12.5 },
                { policy: 'const_3x', branch: 'BASE', totalPnlPct: 25.0 }
            ])
        )

        expect(preparedSections[0]?.columns).toEqual(['Policy', 'Branch', 'TotalPnl%', 'TradesCount'])
        expect(bestPolicy.policy).toBe('const_3x')
        expect(bestPolicy.branch).toBe('BASE')
        expect(bestPolicy.totalPnlPct).toBe(25)
        expect(bestPolicy.rowKey).toBe(buildPolicyBranchMegaRowKey('const_3x', 'BASE', null))
    })

    test('keeps the merged policy row readable across neighboring parts', () => {
        const sections: TableSectionDto[] = [
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 1/4]',
                columns: ['Policy', 'Branch', 'TotalPnl%', 'TradesCount'],
                rows: [
                    ['const_2x', 'BASE', '12.50', '4'],
                    ['const_3x', 'BASE', '25.00', '7']
                ]
            },
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 2/4]',
                columns: ['Policy', 'Branch', 'HadLiquidation', 'StartCapitalUsd'],
                rows: [
                    ['const_2x', 'BASE', 'No', '20000'],
                    ['const_3x', 'BASE', 'Yes', '20000']
                ]
            }
        ]

        const normalizedSections = buildMainDemoPolicyBranchMegaSections(sections)
        const bestPolicy = resolveMainDemoBestPolicyRows(
            normalizedSections,
            createMoneyMetricsRows([
                { policy: 'const_2x', branch: 'BASE', totalPnlPct: 12.5 },
                { policy: 'const_3x', branch: 'BASE', totalPnlPct: 25.0 }
            ])
        )
        const riskSection = bestPolicy.sectionRows.find(item => (item.section.columns ?? []).includes('HadLiquidation'))

        expect(riskSection?.row[riskSection.section.columns!.indexOf('HadLiquidation')]).toBe('Yes')
    })

    test('keeps the summary metrics readable across neighboring parts', () => {
        const sections: TableSectionDto[] = [
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 1/4]',
                columns: [
                    'Policy',
                    'Branch',
                    'TotalPnl%',
                    'TotalPnlUsd',
                    'Days',
                    'TradesCount',
                    'StartDay',
                    'EndDay'
                ],
                rows: [['const_3x', 'BASE', '25.00', '50000', '1113', '7', '2021-10-12', '2026-03-20']]
            },
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 2/4]',
                columns: [
                    'Policy',
                    'Branch',
                    'StartCapitalUsd',
                    'EquityNowUsd',
                    'WithdrawnTotalUsd',
                    'NoTrade%',
                    'AvgStake%',
                    'AvgStake$',
                    'WinRate%',
                    'MaxDD%',
                    'HadLiquidation',
                    'DailyTP%',
                    'DailySL%',
                    'MeanRet%',
                    'Sharpe',
                    'AccountRuinCount',
                    'RecovDays'
                ],
                rows: [
                    [
                        'const_3x',
                        'BASE',
                        '20000',
                        '25000',
                        '15000',
                        '30.0',
                        '5.0',
                        '1000',
                        '54.2',
                        '6.76',
                        'No',
                        '1.20/1.00',
                        '0.70/0.80',
                        '0.42',
                        '1.18',
                        '0.00',
                        '12'
                    ]
                ]
            }
        ]

        const normalizedSections = buildMainDemoPolicyBranchMegaSections(sections)
        const bestPolicy = resolveMainDemoBestPolicyRows(
            normalizedSections,
            createMoneyMetricsRows([{ policy: 'const_3x', branch: 'BASE', totalPnlPct: 25.0 }])
        )

        const readValue = (title: string): string | null => {
            const matched = bestPolicy.sectionRows.find(item => (item.section.columns ?? []).includes(title))
            if (!matched) {
                return null
            }

            return matched.row[matched.section.columns!.indexOf(title)] ?? null
        }

        expect(readValue('StartCapitalUsd')).toBe('20000')
        expect(readValue('EquityNowUsd')).toBe('25000')
        expect(readValue('WithdrawnTotalUsd')).toBe('15000')
        expect(readValue('AvgStake%')).toBe('5.0')
        expect(readValue('DailyTP%')).toBe('1.20/1.00')
        expect(readValue('DailySL%')).toBe('0.70/0.80')
        expect(readValue('Sharpe')).toBe('1.18')
        expect(bestPolicy.moneyMetrics.totalPnlUsd).toBe(25000)
    })
})
