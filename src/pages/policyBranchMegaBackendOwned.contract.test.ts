import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const frontendRoot = path.resolve(__dirname, '..')
const policyBranchMegaPagePath = path.resolve(
    frontendRoot,
    'pages',
    'analysisPages',
    'ui',
    'PolicyBranchMegaPage',
    'ui',
    'PolicyBranchMegaPage.tsx'
)
const legacyReportColumnKeyHelperPath = path.resolve(
    frontendRoot,
    'shared',
    'utils',
    'reportColumnKeys.ts'
)

describe('policy branch mega backend-owned contract', () => {
    test('page does not own all-SL merge or synthetic SL Mode injection', () => {
        const source = fs.readFileSync(policyBranchMegaPagePath, 'utf-8')

        expect(source).not.toContain('buildMegaSectionColumnDescriptorsWithSyntheticSlMode')
        expect(source).not.toContain('mergePolicyBranchMegaSectionsForPart')
        expect(source).not.toContain('mergePolicyBranchMegaSectionsByPart')
        expect(source).not.toContain('mergePolicyBranchMegaSectionsByBucketAndPart')
        expect(source).not.toContain("const MEGA_SL_MODE_COLUMN_NAME = 'SL Mode'")
    })

    test('frontend has no legacy helper that derives report column machine keys from display labels', () => {
        expect(fs.existsSync(legacyReportColumnKeyHelperPath)).toBe(false)
    })
})
