import type { TableSectionDto } from '@/shared/types/report.types'
import {
    assertPolicyBranchMegaPrimaryProfitColumns,
    resolvePolicyBranchMegaPrimaryProfitColumn
} from '@/shared/utils/policyBranchMegaProfitColumns'

describe('policyBranchMegaProfitColumns', () => {
    test('resolves TotalPnl% as primary profit column when backend already returned it', () => {
        expect(resolvePolicyBranchMegaPrimaryProfitColumn(['Policy', 'Branch', 'TotalPnl%', 'TradesCount'])).toBe(
            'TotalPnl%'
        )
    })

    test('throws when part1 section has no TotalPnl% column from backend', () => {
        const sections: TableSectionDto[] = [
            {
                title: '=== Policy Branch Mega (WITH SL) [PART 1/4] ===',
                columns: ['Policy', 'Branch', 'TotalPnlUsd', 'TradesCount'],
                rows: [['const_2x', 'BASE', '5000', '12']]
            }
        ]

        expect(() => assertPolicyBranchMegaPrimaryProfitColumns(sections, 'policy-branch-mega-page')).toThrow(
            '[policy-branch-mega-page] mega part1 section is missing TotalPnl%.'
        )
    })
})
