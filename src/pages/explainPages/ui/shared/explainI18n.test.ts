import { describe, expect, test } from 'vitest'
import type { i18n as I18nInstance } from 'i18next'
import { readExplainTermItems } from './explainI18n'

function createI18nStub(resources: Record<string, unknown>): I18nInstance {
    return {
        language: 'ru',
        resolvedLanguage: 'ru',
        hasResourceBundle: (lng: string, ns: string) => lng === 'ru' && ns === 'explain',
        hasLoadedNamespace: (ns: string, options?: { lng?: string }) => ns === 'explain' && options?.lng === 'ru',
        getResource: (_lng: string, _ns: string, key: string) => resources[key]
    } as unknown as I18nInstance
}

describe('readExplainTermItems', () => {
    test('resolves canonical title for shared explain term', () => {
        const i18n = createI18nStub({
            'page.sections.demo.terms': [{ sharedTermId: 'branch' }]
        })

        expect(readExplainTermItems(i18n, 'page.sections.demo.terms')).toEqual([
            { term: 'Branch', sharedTermId: 'branch' }
        ])
    })

    test('throws when shared explain term duplicates local description', () => {
        const i18n = createI18nStub({
            'page.sections.demo.terms': [
                {
                    term: 'Branch',
                    sharedTermId: 'branch',
                    description: 'Локальный дубликат общего термина.'
                }
            ]
        })

        expect(() => readExplainTermItems(i18n, 'page.sections.demo.terms')).toThrow(
            '[explain.i18n] shared term must not duplicate local description.'
        )
    })

    test('throws when local explain term duplicates shared canonical tooltip without sharedTermId', () => {
        const i18n = createI18nStub({
            'page.sections.demo.terms': [
                {
                    term: 'Branch',
                    description: 'Локальный дубль общего термина.'
                }
            ]
        })

        expect(() => readExplainTermItems(i18n, 'page.sections.demo.terms')).toThrow(
            '[explain.i18n] local shared-term duplicate is forbidden.'
        )
    })

    test('throws when local explain term uses a short tooltip instead of full structured description', () => {
        const i18n = createI18nStub({
            'page.sections.demo.terms': [
                {
                    term: 'MicroTruth',
                    description: 'Факт микро-слоя.'
                }
            ]
        })

        expect(() => readExplainTermItems(i18n, 'page.sections.demo.terms')).toThrow(
            '[explain.i18n] term description must satisfy full-tooltip contract.'
        )
    })
})
