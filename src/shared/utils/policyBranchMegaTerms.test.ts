import {
    getPolicyBranchMegaTermOrThrow,
    POLICY_BRANCH_MEGA_TERM_KEYS
} from './policyBranchMegaTerms'
import { buildSelfTooltipExclusions } from '@/shared/ui/ReportTableTermsBlock/ui/ReportTableTermsBlock'

const SENTINEL_KEYS = [
    'Policy',
    'Branch',
    'SL Mode',
    'TotalPnl%',
    'MaxDD%',
    'HadLiq',
    'AccRuin',
    'Recovered',
    'RecovDays',
    'ReqGain%'
] as const

describe('policyBranchMegaTerms parity', () => {
    test('all ru/en terms resolve with non-empty description and tooltip', () => {
        POLICY_BRANCH_MEGA_TERM_KEYS.forEach(key => {
            const ru = getPolicyBranchMegaTermOrThrow(key, { locale: 'ru', tooltipMode: 'draft' })
            const en = getPolicyBranchMegaTermOrThrow(key, { locale: 'en', tooltipMode: 'draft' })

            expect(ru.description.trim().length).toBeGreaterThan(0)
            expect(en.description.trim().length).toBeGreaterThan(0)
            expect(ru.tooltip.trim().length).toBeGreaterThan(0)
            expect(en.tooltip.trim().length).toBeGreaterThan(0)
        })
    })

    test('english description keeps reading/example structure whenever russian has it', () => {
        POLICY_BRANCH_MEGA_TERM_KEYS.forEach(key => {
            const ru = getPolicyBranchMegaTermOrThrow(key, { locale: 'ru', tooltipMode: 'draft' })
            const en = getPolicyBranchMegaTermOrThrow(key, { locale: 'en', tooltipMode: 'draft' })

            const ruHasReading = ru.description.includes('Как читать:')
            const enHasReading = en.description.includes('How to read:')
            expect(enHasReading).toBe(ruHasReading)

            const ruHasExample = ru.description.includes('Пример:')
            const enHasExample = en.description.includes('Example:')
            expect(enHasExample).toBe(ruHasExample)
        })
    })

    test('sentinel terms keep full english semantic blocks', () => {
        SENTINEL_KEYS.forEach(key => {
            const en = getPolicyBranchMegaTermOrThrow(key, { locale: 'en', tooltipMode: 'draft' })

            expect(en.description.includes('How to read:')).toBe(true)
            expect(en.description.includes('Example:')).toBe(true)
        })
    })

    test('common mega terms resolve self exclusions through shared registry', () => {
        const exclusions = buildSelfTooltipExclusions('Policy', 'Policy')

        expect(exclusions.excludeRuleIds).toContain('policy')
        expect(exclusions.excludeTerms).toContain('Policy')
    })
})
