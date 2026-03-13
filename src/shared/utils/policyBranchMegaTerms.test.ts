import { getPolicyBranchMegaTerm, POLICY_BRANCH_MEGA_TERM_KEYS } from './policyBranchMegaTerms'
import { buildSelfTooltipExclusions } from '@/shared/ui/ReportTableTermsBlock/ui/ReportTableTermsBlock'
import { resolveCommonReportColumnTooltipOrNull } from '@/shared/terms/common'

const SENTINEL_KEYS = [
    'TotalPnl%',
    'MaxDD%',
    'HadLiq',
    'AccRuin',
    'Recovered',
    'RecovDays',
    'ReqGain%'
] as const

const SHARED_MEGA_TERM_KEYS = ['Policy', 'Branch', 'SL Mode', 'StartCap$', 'AccRuin', 'Recovered', 'RecovDays', 'ReqGain%'] as const

describe('policyBranchMegaTerms parity', () => {
    test('all ru/en terms resolve with non-empty description and tooltip', () => {
        POLICY_BRANCH_MEGA_TERM_KEYS.forEach(key => {
            const ru = getPolicyBranchMegaTerm(key, { locale: 'ru', tooltipMode: 'draft' })
            const en = getPolicyBranchMegaTerm(key, { locale: 'en', tooltipMode: 'draft' })

            expect(ru.description.trim().length).toBeGreaterThan(0)
            expect(en.description.trim().length).toBeGreaterThan(0)
            expect(ru.tooltip.trim().length).toBeGreaterThan(0)
            expect(en.tooltip.trim().length).toBeGreaterThan(0)
        })
    })

    test('english description keeps reading/example structure whenever russian has it', () => {
        POLICY_BRANCH_MEGA_TERM_KEYS.filter(key => !SHARED_MEGA_TERM_KEYS.includes(key as never)).forEach(key => {
            const ru = getPolicyBranchMegaTerm(key, { locale: 'ru', tooltipMode: 'draft' })
            const en = getPolicyBranchMegaTerm(key, { locale: 'en', tooltipMode: 'draft' })

            const ruHasReading = ru.description.includes('Как читать:')
            const enHasReading = en.description.includes('How to read:')
            expect(enHasReading).toBe(ruHasReading)

            const ruHasExample = ru.description.includes('Пример:')
            const enHasExample = en.description.includes('Example:')
            expect(enHasExample).toBe(ruHasExample)
        })
    })

    test('sentinel terms keep full english semantic blocks', () => {
        SENTINEL_KEYS.filter(key => !SHARED_MEGA_TERM_KEYS.includes(key as never)).forEach(key => {
            const en = getPolicyBranchMegaTerm(key, { locale: 'en', tooltipMode: 'draft' })

            expect(en.description.includes('How to read:')).toBe(true)
            expect(en.description.includes('Example:')).toBe(true)
        })
    })

    test('shared mega terms reuse canonical common descriptions in RU and EN', () => {
        ;(['ru', 'en'] as const).forEach(locale => {
            SHARED_MEGA_TERM_KEYS.forEach(key => {
                expect(getPolicyBranchMegaTerm(key, { locale, tooltipMode: 'draft' }).description).toBe(
                    resolveCommonReportColumnTooltipOrNull(key, locale)
                )
            })
        })
    })

    test('common mega terms resolve self exclusions through shared registry', () => {
        const exclusions = buildSelfTooltipExclusions('Policy', 'Policy')

        expect(exclusions.excludeRuleIds).toContain('policy')
        expect(exclusions.excludeTerms).toContain('Policy')
    })

    test('mega sentinel texts do not leak raw technical phrasing', () => {
        const missRu = getPolicyBranchMegaTerm('Miss', { locale: 'ru', tooltipMode: 'draft' })
        const missEn = getPolicyBranchMegaTerm('Miss', { locale: 'en', tooltipMode: 'draft' })
        const winRateRu = getPolicyBranchMegaTerm('WinRate%', { locale: 'ru', tooltipMode: 'draft' })
        const meanRetRu = getPolicyBranchMegaTerm('MeanRet%', { locale: 'ru', tooltipMode: 'draft' })
        const meanRetEn = getPolicyBranchMegaTerm('MeanRet%', { locale: 'en', tooltipMode: 'draft' })

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

    test('mega descriptions preserve spaces around explicit tooltip terms and terminal punctuation', () => {
        const daysRu = getPolicyBranchMegaTerm('Days', { locale: 'ru', tooltipMode: 'draft' })
        const antiDRu = getPolicyBranchMegaTerm('AntiD%', { locale: 'ru', tooltipMode: 'draft' })

        expect(daysRu.description).toContain('не моделируются. [[why-weekends|Почему?]]')
        expect(daysRu.description).not.toContain('не моделируются.[[why-weekends|Почему?]]')
        expect(daysRu.description).not.toContain('[[why-weekends|Почему?]].')

        expect(antiDRu.description).toContain(
            'в ветке [[branch|ANTI-D]] реально сработал [[anti-direction|anti-direction]].'
        )
        expect(antiDRu.description).not.toContain('в ветке[[branch|ANTI-D]]')
        expect(antiDRu.description).not.toContain(']]реально')
        expect(antiDRu.description).not.toContain('сработал[[anti-direction|anti-direction]]')
    })

    test('stop reason keeps bullet structure and drops generic count example in RU and EN', () => {
        const stopReasonRu = getPolicyBranchMegaTerm('StopReason', { locale: 'ru', tooltipMode: 'draft' })
        const stopReasonEn = getPolicyBranchMegaTerm('StopReason', { locale: 'en', tooltipMode: 'draft' })

        expect(stopReasonRu.description).toContain('- Ликвидация (ранний stop):')
        expect(stopReasonRu.description).toContain('- Ранний stop без ликвидации:')
        expect(stopReasonRu.description.includes('Пример:')).toBe(false)
        expect(stopReasonRu.description.includes('StopReason=120')).toBe(false)
        expect(stopReasonRu.description.includes('по выбранной строке')).toBe(false)

        expect(stopReasonEn.description).toContain('- Liquidation (early stop):')
        expect(stopReasonEn.description).toContain('- Early stop without liquidation:')
        expect(stopReasonEn.description.includes('Example:')).toBe(false)
        expect(stopReasonEn.description.includes('StopReason=120')).toBe(false)
        expect(stopReasonEn.description.includes('selected row')).toBe(false)
    })
})
