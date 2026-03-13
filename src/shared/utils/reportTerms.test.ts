import { buildReportTermsFromSections } from './reportTerms'

describe('buildReportTermsFromSections', () => {
    test('merges diagnostics alias columns into a single glossary term', () => {
        const terms = buildReportTermsFromSections({
            sections: [
                {
                    title: 'Policy Specificity Split (ALL HISTORY, WITH SL)',
                    columns: ['SpecificDays', 'SpecificTrade%']
                },
                {
                    title: 'Specificity Rolling Guardrail (BY YEAR, CAUSAL)',
                    columns: ['SpecDays', 'SpecTrade%']
                }
            ],
            reportKind: 'backtest_diagnostics',
            contextTag: 'report-terms-test',
            locale: 'ru'
        })

        expect(terms.find(term => term.key === 'SpecificDays')?.title).toBe('SpecificDays / SpecDays')
        expect(terms.find(term => term.key === 'SpecificTrade%')?.title).toBe('SpecificTrade% / SpecTrade%')
        expect(terms.filter(term => term.key === 'SpecificDays')).toHaveLength(1)
        expect(terms.filter(term => term.key === 'SpecificTrade%')).toHaveLength(1)
    })

    test('keeps non-diagnostics report terms isolated by raw column title', () => {
        const terms = buildReportTermsFromSections({
            sections: [
                {
                    title: 'Backtest summary',
                    columns: ['Policy', 'Branch']
                }
            ],
            reportKind: 'backtest_summary',
            contextTag: 'report-terms-test',
            locale: 'ru'
        })

        expect(terms.map(term => term.key)).toEqual(['Policy', 'Branch'])
    })
})
