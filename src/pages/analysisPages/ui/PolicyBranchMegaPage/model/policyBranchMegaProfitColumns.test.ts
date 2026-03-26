import type { TableSectionDto } from '@/shared/types/report.types'
import {
    normalizePolicyBranchMegaProfitColumns,
    resolvePolicyBranchMegaPrimaryProfitColumn
} from '@/shared/utils/policyBranchMegaProfitColumns'

describe('policyBranchMegaProfitColumns', () => {
    test('renames Wealth% to TotalPnl% when wealth has no separate meaning in shown rows', () => {
        const sections: TableSectionDto[] = [
            {
                title: '=== Policy Branch Mega (WITH SL) [PART 1/4] ===',
                columns: ['Policy', 'Branch', 'Wealth%', 'Tr'],
                rows: [['const_2x', 'BASE', '25.00', '12']]
            },
            {
                title: '=== Policy Branch Mega (WITH SL) [PART 2/4] ===',
                columns: ['Policy', 'Branch', 'OnExch$', 'StartCap$'],
                rows: [['const_2x', 'BASE', '20000', '20000']]
            }
        ]

        const normalized = normalizePolicyBranchMegaProfitColumns(sections)

        expect(normalized[0]?.columns).toEqual(['Policy', 'Branch', 'TotalPnl%', 'Tr'])
        expect(resolvePolicyBranchMegaPrimaryProfitColumn(normalized[0]?.columns ?? [])).toBe('TotalPnl%')
    })

    test('drops Wealth% when TotalPnl% already exists and wealth still duplicates it', () => {
        const sections: TableSectionDto[] = [
            {
                title: '=== Policy Branch Mega (WITH SL) [PART 1/4] ===',
                columns: ['Policy', 'Branch', 'Wealth%', 'TotalPnl%', 'Tr'],
                rows: [['const_2x', 'BASE', '25.00', '25.00', '12']]
            },
            {
                title: '=== Policy Branch Mega (WITH SL) [PART 2/4] ===',
                columns: ['Policy', 'Branch', 'OnExch$', 'StartCap$'],
                rows: [['const_2x', 'BASE', '20000', '20000']]
            }
        ]

        const normalized = normalizePolicyBranchMegaProfitColumns(sections)

        expect(normalized[0]?.columns).toEqual(['Policy', 'Branch', 'TotalPnl%', 'Tr'])
        expect(normalized[0]?.rows?.[0]).toEqual(['const_2x', 'BASE', '25.00', '12'])
    })

    test('keeps Wealth% when active on-exchange balance grows above start capital', () => {
        const sections: TableSectionDto[] = [
            {
                title: '=== Policy Branch Mega (WITH SL) [PART 1/4] ===',
                columns: ['Policy', 'Branch', 'Wealth%', 'TotalPnl%', 'Tr'],
                rows: [['const_2x', 'BASE', '25.00', '25.00', '12']]
            },
            {
                title: '=== Policy Branch Mega (WITH SL) [PART 2/4] ===',
                columns: ['Policy', 'Branch', 'OnExch$', 'StartCap$'],
                rows: [['const_2x', 'BASE', '24000', '20000']]
            }
        ]

        const normalized = normalizePolicyBranchMegaProfitColumns(sections)

        expect(normalized[0]?.columns).toEqual(['Policy', 'Branch', 'Wealth%', 'TotalPnl%', 'Tr'])
    })
})
