import { describe, expect, test } from 'vitest'
import { resolveReportSectionDescription } from './reportDescriptions'

describe('resolveReportSectionDescription', () => {
    test('returns specific description for PFI feature quality section', () => {
        const description = resolveReportSectionDescription('pfi_per_model', 'Model quality by section', 'ru')

        expect(description).toContain('общего качества модели')
        expect(description).toContain('источнику оценки')
    })

    test('returns specific description for PFI value buckets section', () => {
        const description = resolveReportSectionDescription('pfi_per_model', 'Value buckets and prediction quality', 'ru')

        expect(description).toContain('диапазонам значений')
        expect(description).toContain('переоценивает вероятность')
    })

    test('keeps generic fallback for unknown PFI section title', () => {
        const description = resolveReportSectionDescription('pfi_per_model', 'Some custom PFI block', 'en')

        expect(description).toContain('Permutation Feature Importance')
        expect(description).toContain('AUC drop')
    })

    test('reuses PFI section descriptions for feature-detail report kind', () => {
        const description = resolveReportSectionDescription(
            'pfi_per_model_feature_detail',
            'Model quality by section',
            'ru'
        )

        expect(description).toContain('общего качества модели')
        expect(description).toContain('источнику оценки')
    })

    test('returns specific description for current model-stats overview section', () => {
        const description = resolveReportSectionDescription('backtest_model_stats', 'Models overview', 'ru')

        expect(description).toContain('Сводная таблица по моделям')
        expect(description).toContain('сколько строк лежит под этой оценкой')
    })

    test('explains that Cross and Isolated are read from policy name when margin column is omitted', () => {
        const description = resolveReportSectionDescription('backtest_summary', 'Policies (baseline config)', 'ru')

        expect(description).toContain('Cross или Isolated')
        expect(description).toContain('не дублируется отдельным столбцом')
    })
})
