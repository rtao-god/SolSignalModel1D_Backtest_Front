import {
    buildPolicyBranchMegaTabsFromAvailableParts,
    resolvePolicyBranchMegaPartFromAnchor
} from './policyBranchMegaTabs'

describe('policyBranchMega tabs from available parts', () => {
    test('builds only requested part tabs for ordinary bucket views', () => {
        const tabs = buildPolicyBranchMegaTabsFromAvailableParts([1, 2, 3], 'daily', 'aggregate')

        expect(tabs.map(tab => tab.anchor)).toEqual([
            'policy-branch-terms-section-1',
            'policy-branch-section-1',
            'policy-branch-terms-section-2',
            'policy-branch-section-2',
            'policy-branch-terms-section-3',
            'policy-branch-section-3'
        ])
    })

    test('splits total separate view into bucket-specific part tabs', () => {
        const tabs = buildPolicyBranchMegaTabsFromAvailableParts([1, 2], 'total', 'separate')

        expect(tabs.map(tab => tab.anchor)).toEqual([
            'policy-branch-terms-section-daily-1',
            'policy-branch-section-daily-1',
            'policy-branch-terms-section-daily-2',
            'policy-branch-section-daily-2',
            'policy-branch-terms-section-intraday-1',
            'policy-branch-section-intraday-1',
            'policy-branch-terms-section-intraday-2',
            'policy-branch-section-intraday-2',
            'policy-branch-terms-section-delayed-1',
            'policy-branch-section-delayed-1',
            'policy-branch-terms-section-delayed-2',
            'policy-branch-section-delayed-2'
        ])
    })
})

describe('resolvePolicyBranchMegaPartFromAnchor', () => {
    test('extracts part number from table and glossary anchors', () => {
        expect(resolvePolicyBranchMegaPartFromAnchor('#policy-branch-section-daily-2')).toBe(2)
        expect(resolvePolicyBranchMegaPartFromAnchor('policy-branch-terms-section-3')).toBe(3)
        expect(resolvePolicyBranchMegaPartFromAnchor('#policy-branch-section-1')).toBe(1)
    })

    test('returns null for unrelated anchors', () => {
        expect(resolvePolicyBranchMegaPartFromAnchor('#policy-branch-overview')).toBeNull()
        expect(resolvePolicyBranchMegaPartFromAnchor(null)).toBeNull()
    })
})
