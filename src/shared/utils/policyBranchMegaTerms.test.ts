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

    test('mega sentinel texts do not leak raw technical phrasing', () => {
        const missRu = getPolicyBranchMegaTermOrThrow('Miss', { locale: 'ru', tooltipMode: 'draft' })
        const missEn = getPolicyBranchMegaTermOrThrow('Miss', { locale: 'en', tooltipMode: 'draft' })
        const winRateRu = getPolicyBranchMegaTermOrThrow('WinRate%', { locale: 'ru', tooltipMode: 'draft' })
        const meanRetRu = getPolicyBranchMegaTermOrThrow('MeanRet%', { locale: 'ru', tooltipMode: 'draft' })
        const meanRetEn = getPolicyBranchMegaTermOrThrow('MeanRet%', { locale: 'en', tooltipMode: 'draft' })

        expect(missRu.description.includes('[StartDay..EndDay]')).toBe(false)
        expect(missEn.description.includes('[StartDay..EndDay]')).toBe(false)
        expect(missRu.description.includes('weekend-skip')).toBe(false)
        expect(missEn.description.includes('weekend-skip')).toBe(false)
        expect(missRu.description.includes('/trace')).toBe(false)
        expect(winRateRu.description.includes('Считается по отдельным сделкам, а не по дням.')).toBe(false)
        expect(meanRetRu.description.includes('агрегац')).toBe(false)
        expect(meanRetEn.description.includes('aggregation')).toBe(false)
        expect(meanRetRu.description.includes('сворачиваются в один дневной итог')).toBe(true)
        expect(meanRetEn.description.includes('combined into one daily result')).toBe(true)
    })
})
