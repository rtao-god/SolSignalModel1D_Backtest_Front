import { buildReportTermsFromReferences, buildReportTermsFromSections } from './reportTerms'

function createColumnDescriptor(
    displayLabel: string,
    columnKey: string,
    termKey: string
) {
    return {
        displayLabel,
        columnKey,
        termKey
    }
}

describe('buildReportTermsFromSections', () => {
    test('merges diagnostics alias columns into a single glossary term', () => {
        const terms = buildReportTermsFromSections({
            sections: [
                {
                    title: 'Policy Specificity Split (ALL HISTORY, WITH SL)',
                    columns: ['SpecificDays', 'SpecificTrade%'],
                    columnKeys: ['specific_days', 'specific_trade_pct'],
                    columnDescriptors: [
                        createColumnDescriptor('SpecificDays', 'specific_days', 'SpecificDays'),
                        createColumnDescriptor('SpecificTrade%', 'specific_trade_pct', 'SpecificTrade%')
                    ]
                },
                {
                    title: 'Specificity Rolling Guardrail (BY YEAR, CAUSAL)',
                    columns: ['SpecDays', 'SpecTrade%'],
                    columnKeys: ['spec_days', 'spec_trade_pct'],
                    columnDescriptors: [
                        createColumnDescriptor('SpecDays', 'spec_days', 'SpecificDays'),
                        createColumnDescriptor('SpecTrade%', 'spec_trade_pct', 'SpecificTrade%')
                    ]
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

    test('fails fast when diagnostics sections do not publish owner column descriptors', () => {
        expect(() =>
            buildReportTermsFromSections({
                sections: [
                    {
                        title: 'Policy diagnostics',
                        columns: ['Policy'],
                        columnKeys: ['policy']
                    }
                ],
                reportKind: 'backtest_diagnostics',
                contextTag: 'report-terms-test',
                locale: 'ru'
            })
        ).toThrow(/missing owner columnDescriptors/i)
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

    test('uses backend owner termKey for non-diagnostics report terms when descriptors are present', () => {
        const terms = buildReportTermsFromSections({
            sections: [
                {
                    title: 'Backtest summary',
                    columns: ['Total return'],
                    columnKeys: ['total_pnl_pct'],
                    columnDescriptors: [
                        createColumnDescriptor('Total return', 'total_pnl_pct', 'TotalPnl%')
                    ]
                }
            ],
            reportKind: 'backtest_summary',
            contextTag: 'report-terms-test',
            locale: 'ru',
            requireColumnDescriptors: true
        })

        expect(terms.map(term => term.key)).toEqual(['TotalPnl%'])
    })

    test('fails fast for non-diagnostics API sections when owner descriptors are required', () => {
        expect(() =>
            buildReportTermsFromSections({
                sections: [
                    {
                        title: 'Backtest summary',
                        columns: ['Policy'],
                        columnKeys: ['policy']
                    }
                ],
                reportKind: 'backtest_summary',
                contextTag: 'report-terms-test',
                locale: 'ru',
                requireColumnDescriptors: true
            })
        ).toThrow(/report_column_registry/)
    })

    test('builds canonical custom terms with merged self aliases', () => {
        const terms = buildReportTermsFromReferences({
            references: [
                {
                    key: 'Policy',
                    title: 'Policy',
                    selfAliases: ['Политика']
                }
            ],
            contextTag: 'report-terms-test',
            resolveDescription: () => 'Описание policy.',
            resolveTooltip: () => 'Tooltip policy.',
            resolveSelfAliases: () => ['Policy']
        })

        expect(terms).toEqual([
            {
                key: 'Policy',
                title: 'Policy',
                description: 'Описание policy.',
                tooltip: 'Tooltip policy.',
                selfAliases: ['Политика', 'Policy']
            }
        ])
    })

    test('builds PFI feature-detail terms without missing owner tooltips', () => {
        const terms = buildReportTermsFromSections({
            sections: [
                {
                    title: 'Model quality by section',
                    columns: ['Model', 'ROC-AUC', 'Brier']
                }
            ],
            reportKind: 'pfi_per_model_feature_detail',
            contextTag: 'report-terms-test',
            locale: 'ru'
        })

        expect(terms.map(term => term.key)).toEqual(['Model', 'ROC-AUC', 'Brier'])
        expect(terms.every(term => term.description.trim().length > 0)).toBe(true)
    })

    test('builds model-stats terms for the current backend overview schema', () => {
        const terms = buildReportTermsFromSections({
            sections: [
                {
                    title: 'Models overview',
                    columns: ['Family', 'Scope', 'ModelKey', 'Model', 'Threshold', 'BaselineAuc', 'EvalRows', 'EvalPos', 'EvalNeg']
                }
            ],
            reportKind: 'backtest_model_stats',
            contextTag: 'report-terms-test',
            locale: 'ru'
        })

        expect(terms.map(term => term.key)).toEqual([
            'Family',
            'Scope',
            'ModelKey',
            'Model',
            'Threshold',
            'BaselineAuc',
            'EvalRows',
            'EvalPos',
            'EvalNeg'
        ])
        expect(terms.every(term => term.description.trim().length > 0)).toBe(true)
    })
})
