import type { TableSectionDto } from '@/shared/types/report.types'
import {
    buildMainDemoPolicyBranchMegaSections,
    resolveMainDemoBestPolicyRows
} from './mainBestPolicySectionModel'

describe('mainBestPolicySectionModel', () => {
    test('uses owner profit normalization before resolving the anchor policy row', () => {
        const sections: TableSectionDto[] = [
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 1/4]',
                columns: ['Policy', 'Branch', 'Wealth%', 'Tr'],
                rows: [
                    ['const_2x', 'BASE', '12.50', '4'],
                    ['const_3x', 'BASE', '25.00', '7']
                ]
            },
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 2/4]',
                columns: ['Policy', 'Branch', 'OnExch$', 'StartCap$'],
                rows: [
                    ['const_2x', 'BASE', '20000', '20000'],
                    ['const_3x', 'BASE', '20000', '20000']
                ]
            }
        ]

        const normalizedSections = buildMainDemoPolicyBranchMegaSections(sections)
        const bestPolicy = resolveMainDemoBestPolicyRows(normalizedSections)

        expect(normalizedSections[0]?.columns).toEqual(['Policy', 'Branch', 'TotalPnl%', 'Tr'])
        expect(bestPolicy.policy).toBe('const_3x')
        expect(bestPolicy.branch).toBe('BASE')
        expect(bestPolicy.totalPnlPct).toBe(25)
    })

    test('keeps the merged policy row readable across neighboring parts', () => {
        const sections: TableSectionDto[] = [
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 1/4]',
                columns: ['Policy', 'Branch', 'TotalPnl%', 'Tr'],
                rows: [
                    ['const_2x', 'BASE', '12.50', '4'],
                    ['const_3x', 'BASE', '25.00', '7']
                ]
            },
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 2/4]',
                columns: ['Policy', 'Branch', 'HadLiq', 'StartCap$'],
                rows: [
                    ['const_2x', 'BASE', 'No', '20000'],
                    ['const_3x', 'BASE', 'Yes', '20000']
                ]
            }
        ]

        const normalizedSections = buildMainDemoPolicyBranchMegaSections(sections)
        const bestPolicy = resolveMainDemoBestPolicyRows(normalizedSections)
        const riskSection = bestPolicy.sectionRows.find(item => (item.section.columns ?? []).includes('HadLiq'))

        expect(riskSection?.row[riskSection.section.columns!.indexOf('HadLiq')]).toBe('Yes')
    })

    test('keeps the summary metrics readable across neighboring parts', () => {
        const sections: TableSectionDto[] = [
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 1/4]',
                columns: ['Policy', 'Branch', 'TotalPnl%', 'TotalPnl$', 'Days', 'Tr', 'StartDay', 'EndDay'],
                rows: [['const_3x', 'BASE', '25.00', '50000', '1113', '7', '2021-10-12', '2026-03-20']]
            },
            {
                title: 'Policy Branch Mega [Daily] WITH SL [PART 2/4]',
                columns: [
                    'Policy',
                    'Branch',
                    'StartCap$',
                    'BucketNow$',
                    'Withdrawn$',
                    'NoTrade%',
                    'AvgStake%',
                    'AvgStake$',
                    'WinRate%',
                    'MaxDD%',
                    'HadLiq',
                    'DailyTP%',
                    'DailySL%',
                    'MeanRet%',
                    'Sharpe',
                    'AccRuin',
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
        const bestPolicy = resolveMainDemoBestPolicyRows(normalizedSections)

        const readValue = (title: string): string | null => {
            const matched = bestPolicy.sectionRows.find(item => (item.section.columns ?? []).includes(title))
            if (!matched) {
                return null
            }

            return matched.row[matched.section.columns!.indexOf(title)] ?? null
        }

        expect(readValue('StartCap$')).toBe('20000')
        expect(readValue('BucketNow$')).toBe('25000')
        expect(readValue('Withdrawn$')).toBe('15000')
        expect(readValue('AvgStake%')).toBe('5.0')
        expect(readValue('DailyTP%')).toBe('1.20/1.00')
        expect(readValue('DailySL%')).toBe('0.70/0.80')
        expect(readValue('Sharpe')).toBe('1.18')
    })
})
