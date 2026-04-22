import type { TableSectionDto } from '@/shared/types/report.types'
import {
    resolvePolicyBranchMegaMetricValue,
    resolvePolicyBranchMegaMetricRawValue,
    resolvePolicyBranchMegaCurrentBalance,
    type PolicyBranchMegaSectionRowRef
} from './policyBranchMegaCurrentBalance'

function createSection(columns: string[], row: string[], title: string): PolicyBranchMegaSectionRowRef {
    const section: TableSectionDto = {
        title,
        columns,
        rows: [row]
    }

    return { section, row }
}

describe('policyBranchMegaCurrentBalance', () => {
    test('returns a repeated metric when all matching sections agree', () => {
        const value = resolvePolicyBranchMegaMetricValue(
            [
                createSection(['Policy', 'Branch', 'TradesCount'], ['const_3x', 'BASE', '17'], 'part-1'),
                createSection(['Policy', 'Branch', 'TradesCount'], ['const_3x', 'BASE', '17'], 'part-3')
            ],
            'TradesCount'
        )

        expect(value).toBe('17')
    })

    test('returns a repeated raw metric without forcing numeric parsing', () => {
        const value = resolvePolicyBranchMegaMetricRawValue(
            [
                createSection(['Policy', 'Branch', 'StartDay'], ['const_3x', 'BASE', '2021-10-12'], 'part-1'),
                createSection(['Policy', 'Branch', 'StartDay'], ['const_3x', 'BASE', '2021-10-12'], 'part-3')
            ],
            'StartDay'
        )

        expect(value).toBe('2021-10-12')
    })

    test('returns composite raw metrics without numeric coercion', () => {
        const value = resolvePolicyBranchMegaMetricRawValue(
            [createSection(['Policy', 'Branch', 'DailyTP%'], ['const_3x', 'BASE', '3.23 / 3.21 / 3.24'], 'part-2')],
            'DailyTP%'
        )

        expect(value).toBe('3.23 / 3.21 / 3.24')
    })

    test('throws when a repeated metric diverges across sections', () => {
        expect(() =>
            resolvePolicyBranchMegaMetricValue(
                [
                    createSection(['Policy', 'Branch', 'TradesCount'], ['const_3x', 'BASE', '17'], 'part-1'),
                    createSection(['Policy', 'Branch', 'TradesCount'], ['const_3x', 'BASE', '18'], 'part-3')
                ],
                'TradesCount'
            )
        ).toThrow('TradesCount diverged across mega sections')
    })

    test('reads current balance from canonical EquityNowUsd column', () => {
        const value = resolvePolicyBranchMegaCurrentBalance([
            createSection(['Policy', 'Branch', 'EquityNowUsd'], ['const_3x', 'BASE', '25000'], 'part-2')
        ])

        expect(value).toBe('25000')
    })

    test('throws when canonical current balance is absent', () => {
        expect(() =>
            resolvePolicyBranchMegaCurrentBalance([
                createSection(['Policy', 'Branch', 'WithdrawnTotalUsd'], ['const_3x', 'BASE', '25000'], 'part-2')
            ])
        ).toThrow('Expected EquityNowUsd')
    })
})
