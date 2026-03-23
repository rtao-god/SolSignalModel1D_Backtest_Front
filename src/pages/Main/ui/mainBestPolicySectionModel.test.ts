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
})
