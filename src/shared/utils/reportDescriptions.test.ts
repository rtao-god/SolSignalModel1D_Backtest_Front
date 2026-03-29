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
})
