import {
    buildPolicyBranchMegaSectionEntriesFromAvailableParts,
    buildPolicyBranchMegaTabsFromAvailableParts,
    resolvePolicyBranchMegaAnchorTarget,
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

    test('builds canonical section entries for separate total view', () => {
        const entries = buildPolicyBranchMegaSectionEntriesFromAvailableParts([1, 2], 'total', 'separate')

        expect(entries).toEqual([
            { part: 1, bucket: 'daily' },
            { part: 2, bucket: 'daily' },
            { part: 1, bucket: 'intraday' },
            { part: 2, bucket: 'intraday' },
            { part: 1, bucket: 'delayed' },
            { part: 2, bucket: 'delayed' }
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

describe('resolvePolicyBranchMegaAnchorTarget', () => {
    test('extracts bucket, part and section kind from mega anchors', () => {
        expect(resolvePolicyBranchMegaAnchorTarget('#policy-branch-section-daily-2')).toEqual({
            anchor: 'policy-branch-section-daily-2',
            bucket: 'daily',
            part: 2,
            sectionKind: 'table'
        })

        expect(resolvePolicyBranchMegaAnchorTarget('policy-branch-terms-section-3')).toEqual({
            anchor: 'policy-branch-terms-section-3',
            bucket: null,
            part: 3,
            sectionKind: 'terms'
        })
    })

    test('returns null for unrelated anchors', () => {
        expect(resolvePolicyBranchMegaAnchorTarget('#policy-branch-overview')).toBeNull()
        expect(resolvePolicyBranchMegaAnchorTarget('')).toBeNull()
    })
})
