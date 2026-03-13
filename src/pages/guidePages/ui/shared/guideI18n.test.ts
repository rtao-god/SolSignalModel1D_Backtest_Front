import { describe, expect, test } from 'vitest'
import type { i18n as I18nInstance } from 'i18next'
import { readGuideTermItems } from './guideI18n'

function createI18nStub(resources: Record<string, unknown>): I18nInstance {
    return {
        language: 'ru',
        resolvedLanguage: 'ru',
        hasResourceBundle: (lng: string, ns: string) => lng === 'ru' && ns === 'guide',
        hasLoadedNamespace: (ns: string, options?: { lng?: string }) => ns === 'guide' && options?.lng === 'ru',
        getResource: (_lng: string, _ns: string, key: string) => resources[key]
    } as unknown as I18nInstance
}

describe('readGuideTermItems', () => {
    test('resolves shared term title when local description is removed', () => {
        const i18n = createI18nStub({
            'page.sections.demo.terms': [{ id: 'demo-policy', sharedTermId: 'policy' }]
        })

        expect(readGuideTermItems(i18n, 'page.sections.demo.terms')).toEqual([
            { id: 'demo-policy', term: 'Policy', sharedTermId: 'policy' }
        ])
    })

    test('throws when shared term duplicates local description', () => {
        const i18n = createI18nStub({
            'page.sections.demo.terms': [
                {
                    id: 'demo-policy',
                    term: 'Policy',
                    sharedTermId: 'policy',
                    description: 'Локальный дубликат общего термина.'
                }
            ]
        })

        expect(() => readGuideTermItems(i18n, 'page.sections.demo.terms')).toThrow(
            '[guide.i18n] shared term must not duplicate local description.'
        )
    })

    test('throws when local guide term duplicates shared canonical tooltip without sharedTermId', () => {
        const i18n = createI18nStub({
            'page.sections.demo.terms': [
                {
                    id: 'demo-policy',
                    term: 'Policy',
                    description: 'Локальный дубль общего термина.'
                }
            ]
        })

        expect(() => readGuideTermItems(i18n, 'page.sections.demo.terms')).toThrow(
            '[guide.i18n] local shared-term duplicate is forbidden.'
        )
    })

    test('allows canonical owner definition when item id matches shared registry id', () => {
        const i18n = createI18nStub({
            'page.sections.demo.terms': [
                {
                    id: 'landing-interop',
                    term: 'Interop',
                    description:
                        'Interop — canonical owner definition for the shared tooltip registry.\n\nWhat it shows:\nthis guide item intentionally stays the owner description for the matching shared registry rule.\n\nHow to read it:\nwhen the owner definition changes here, the shared meaning changes everywhere this canonical term is reused.'
                }
            ]
        })

        expect(readGuideTermItems(i18n, 'page.sections.demo.terms')).toEqual([
            {
                id: 'landing-interop',
                term: 'Interop',
                description:
                    'Interop — canonical owner definition for the shared tooltip registry.\n\nWhat it shows:\nthis guide item intentionally stays the owner description for the matching shared registry rule.\n\nHow to read it:\nwhen the owner definition changes here, the shared meaning changes everywhere this canonical term is reused.'
            }
        ])
    })

    test('throws when local guide term uses a short tooltip instead of full structured description', () => {
        const i18n = createI18nStub({
            'page.sections.demo.terms': [
                {
                    id: 'demo-endpoint',
                    term: 'endpoint',
                    description: 'HTTP точка входа.'
                }
            ]
        })

        expect(() => readGuideTermItems(i18n, 'page.sections.demo.terms')).toThrow(
            '[guide.i18n] term description must satisfy full-tooltip contract.'
        )
    })
})
