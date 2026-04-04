import { resolveMatchingTermTooltipRuleIds } from '@/shared/ui/TermTooltip/ui/renderTermTooltipRichText'
import { resolveCommonReportColumnTooltipOrNull } from './index'

describe('common report column tooltips', () => {
    test('resolves shared TotalPnl, Wealth, OnExch, funding net, and localized start capital descriptions', () => {
        expect(resolveCommonReportColumnTooltipOrNull('TotalPnl%', 'ru')).toContain('главный итог прибыли или убытка')
        expect(resolveCommonReportColumnTooltipOrNull('Wealth%', 'ru')).toContain('без [[landing-reinvestment|реинвестирования]] Wealth% по сути дублирует')
        expect(resolveCommonReportColumnTooltipOrNull('OnExch%', 'ru')).toContain('результат только по капиталу')
        expect(resolveCommonReportColumnTooltipOrNull('SumFundingNetUsd', 'ru')).toContain('чистый денежный итог funding')
        expect(resolveCommonReportColumnTooltipOrNull('стартовый капитал', 'ru')).toContain('Стартовый капитал')

        expect(resolveCommonReportColumnTooltipOrNull('TotalPnl%', 'en')).toContain('main profit or loss result')
        expect(resolveCommonReportColumnTooltipOrNull('Wealth%', 'en')).toContain('without [[landing-reinvestment|reinvestment]], Wealth% effectively duplicates')
        expect(resolveCommonReportColumnTooltipOrNull('OnExch%', 'en')).toContain('return of the capital that remains on exchange')
        expect(resolveCommonReportColumnTooltipOrNull('SumFundingNetUsd', 'en')).toContain('net funding cash result')
        expect(resolveCommonReportColumnTooltipOrNull('Starting capital', 'en')).toContain('Starting capital')
    })

    test('resolves shared Sharpe, Sortino, Calmar, and CAGR descriptions', () => {
        expect(resolveCommonReportColumnTooltipOrNull('Sharpe', 'ru')).toContain('Sharpe - это')
        expect(resolveCommonReportColumnTooltipOrNull('Sortino', 'ru')).toContain('Sortino - это')
        expect(resolveCommonReportColumnTooltipOrNull('Calmar', 'ru')).toContain('Calmar - это')
        expect(resolveCommonReportColumnTooltipOrNull('CAGR%', 'ru')).toContain('средний годовой темп роста')

        expect(resolveCommonReportColumnTooltipOrNull('Sharpe', 'en')).toContain('Sharpe is the check')
        expect(resolveCommonReportColumnTooltipOrNull('Sortino', 'en')).toContain('Sortino is the check')
        expect(resolveCommonReportColumnTooltipOrNull('Calmar', 'en')).toContain('Calmar is the check')
        expect(resolveCommonReportColumnTooltipOrNull('CAGR%', 'en')).toContain('average annual compound growth rate')
    })

    test('registers Sharpe, Sortino, Calmar, and CAGR tooltip rules', () => {
        expect(resolveMatchingTermTooltipRuleIds('Sharpe')).toContain('sharpe-ratio')
        expect(resolveMatchingTermTooltipRuleIds('Sortino')).toContain('sortino-ratio')
        expect(resolveMatchingTermTooltipRuleIds('Calmar')).toContain('calmar-ratio')
        expect(resolveMatchingTermTooltipRuleIds('CAGR%')).toContain('cagr-ratio')
    })
})
