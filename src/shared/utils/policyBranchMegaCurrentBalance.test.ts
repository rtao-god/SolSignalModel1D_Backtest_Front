import type { TableSectionDto } from '@/shared/types/report.types'
import {
    resolvePolicyBranchMegaMetricValue,
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
                createSection(['Policy', 'Branch', 'Tr'], ['const_3x', 'BASE', '17'], 'part-1'),
                createSection(['Policy', 'Branch', 'Tr'], ['const_3x', 'BASE', '17.0'], 'part-3')
            ],
            'Tr'
        )

        expect(value).toBe('17')
    })

    test('throws when a repeated metric diverges across sections', () => {
        expect(() =>
            resolvePolicyBranchMegaMetricValue(
                [
                    createSection(['Policy', 'Branch', 'Tr'], ['const_3x', 'BASE', '17'], 'part-1'),
                    createSection(['Policy', 'Branch', 'Tr'], ['const_3x', 'BASE', '18'], 'part-3')
                ],
                'Tr'
            )
        ).toThrow('Tr diverged across mega sections')
    })

    test('prefers OnExch$ when it is the only current balance alias', () => {
        const value = resolvePolicyBranchMegaCurrentBalance([
            createSection(['Policy', 'Branch', 'OnExch$'], ['const_3x', 'BASE', '25000'], 'part-2')
        ])

        expect(value).toBe('25000')
    })

    test('falls back to BucketNow$ when part2 alias is absent', () => {
        const value = resolvePolicyBranchMegaCurrentBalance([
            createSection(['Policy', 'Branch', 'BucketNow$'], ['const_3x', 'BASE', '25000'], 'part-1')
        ])

        expect(value).toBe('25000')
    })

    test('accepts equal BucketNow$ and OnExch$ aliases', () => {
        const value = resolvePolicyBranchMegaCurrentBalance([
            createSection(['Policy', 'Branch', 'BucketNow$'], ['const_3x', 'BASE', '25.00k'], 'part-1'),
            createSection(['Policy', 'Branch', 'OnExch$'], ['const_3x', 'BASE', '25000'], 'part-2')
        ])

        expect(value).toBe('25000')
    })

    test('throws when BucketNow$ and OnExch$ aliases diverge', () => {
        expect(() =>
            resolvePolicyBranchMegaCurrentBalance([
                createSection(['Policy', 'Branch', 'BucketNow$'], ['const_3x', 'BASE', '24000'], 'part-1'),
                createSection(['Policy', 'Branch', 'OnExch$'], ['const_3x', 'BASE', '25000'], 'part-2')
            ])
        ).toThrow('current balance aliases diverged')
    })
})
