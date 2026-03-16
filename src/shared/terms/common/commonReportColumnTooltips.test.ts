import { resolveMatchingTermTooltipRuleIds } from '@/shared/ui/TermTooltip/ui/renderTermTooltipRichText'
import { resolveCommonReportColumnTooltipOrNull } from './index'

describe('common report column tooltips', () => {
    test('resolves shared TotalPnl, Wealth, OnExch, and localized start capital descriptions', () => {
        expect(resolveCommonReportColumnTooltipOrNull('TotalPnl%', 'ru')).toContain('метрика собирает полный денежный результат строки')
        expect(resolveCommonReportColumnTooltipOrNull('Wealth%', 'ru')).toContain('полный результат стратегии')
        expect(resolveCommonReportColumnTooltipOrNull('OnExch%', 'ru')).toContain('результат только по капиталу')
        expect(resolveCommonReportColumnTooltipOrNull('стартовый капитал', 'ru')).toContain('Стартовый капитал')

        expect(resolveCommonReportColumnTooltipOrNull('TotalPnl%', 'en')).toContain('the metric captures the full money result of the row')
        expect(resolveCommonReportColumnTooltipOrNull('Wealth%', 'en')).toContain('final strategy return')
        expect(resolveCommonReportColumnTooltipOrNull('OnExch%', 'en')).toContain('return of the capital that remains on exchange')
        expect(resolveCommonReportColumnTooltipOrNull('Starting capital', 'en')).toContain('Starting capital')
    })

    test('resolves shared Calmar and CAGR descriptions', () => {
        expect(resolveCommonReportColumnTooltipOrNull('Calmar', 'ru')).toContain('отношение годового темпа роста')
        expect(resolveCommonReportColumnTooltipOrNull('CAGR%', 'ru')).toContain('средний годовой темп роста')

        expect(resolveCommonReportColumnTooltipOrNull('Calmar', 'en')).toContain('ratio of annualized growth')
        expect(resolveCommonReportColumnTooltipOrNull('CAGR%', 'en')).toContain('average annual compound growth rate')
    })

    test('registers Calmar and CAGR tooltip rules', () => {
        expect(resolveMatchingTermTooltipRuleIds('Calmar')).toContain('calmar-ratio')
        expect(resolveMatchingTermTooltipRuleIds('CAGR%')).toContain('cagr-ratio')
    })
})
