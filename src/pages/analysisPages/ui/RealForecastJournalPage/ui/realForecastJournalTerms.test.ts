import { resolveReportColumnTooltip, resolveReportKeyTooltip } from '@/shared/utils/reportTooltips'
import { resolveRealForecastJournalColumnTooltip } from './realForecastJournalTerms'

describe('realForecastJournalTerms', () => {
    test('reuses shared glossary for policy and current-price columns', () => {
        expect(resolveRealForecastJournalColumnTooltip('Ветка', 'ru')).toEqual({
            description: resolveReportColumnTooltip('current_prediction_history', undefined, 'Branch', 'ru'),
            selfAliases: ['Branch', 'Ветка']
        })

        expect(resolveRealForecastJournalColumnTooltip('Current SOL price', 'en')).toEqual({
            description: resolveReportKeyTooltip(
                'current_prediction_history',
                undefined,
                'Current SOL/USDT price',
                'en'
            ),
            selfAliases: ['Current SOL price', 'Current SOL/USDT price', 'Текущая цена SOL', 'Текущая цена SOL/USDT']
        })
    })

    test('returns page-specific descriptions for live and comparison-only columns', () => {
        const liveStatusRu = resolveRealForecastJournalColumnTooltip('Текущий статус', 'ru')
        const liveVsTpEn = resolveRealForecastJournalColumnTooltip('Current vs TP', 'en')
        const rangeRu = resolveRealForecastJournalColumnTooltip('Диапазон', 'ru')

        expect(liveStatusRu?.description).toContain('intraday-состояние')
        expect(liveStatusRu?.description).toContain('TP/SL/liquidation')
        expect(liveVsTpEn?.description).toContain('take-profit')
        expect(rangeRu?.description).toContain('confidence-bucket')
    })
})
