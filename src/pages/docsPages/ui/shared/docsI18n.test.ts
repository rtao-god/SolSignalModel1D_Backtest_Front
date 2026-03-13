import { describe, expect, test } from 'vitest'
import type { i18n as I18nInstance } from 'i18next'
import { readDocsTermItems } from './docsI18n'

function createI18nStub(resources: Record<string, unknown>): I18nInstance {
    return {
        language: 'ru',
        resolvedLanguage: 'ru',
        hasResourceBundle: (lng: string, ns: string) => lng === 'ru' && ns === 'docs',
        hasLoadedNamespace: (ns: string, options?: { lng?: string }) => ns === 'docs' && options?.lng === 'ru',
        getResource: (_lng: string, _ns: string, key: string) => resources[key]
    } as unknown as I18nInstance
}

describe('readDocsTermItems', () => {
    test('resolves shared term title when local description is removed', () => {
        const i18n = createI18nStub({
            'page.glossary.terms': [{ id: 'demo-policy', sharedTermId: 'policy' }]
        })

        expect(readDocsTermItems(i18n, 'page.glossary.terms')).toEqual([
            { id: 'demo-policy', term: 'Policy', sharedTermId: 'policy' }
        ])
    })

    test('throws when shared docs term duplicates local description', () => {
        const i18n = createI18nStub({
            'page.glossary.terms': [
                {
                    id: 'demo-policy',
                    term: 'Policy',
                    sharedTermId: 'policy',
                    description: 'Локальный дубликат общего термина.'
                }
            ]
        })

        expect(() => readDocsTermItems(i18n, 'page.glossary.terms')).toThrow(
            '[docs.i18n] shared term must not duplicate local description.'
        )
    })

    test('throws when local docs term duplicates shared canonical tooltip without sharedTermId', () => {
        const i18n = createI18nStub({
            'page.glossary.terms': [
                {
                    id: 'demo-policy',
                    term: 'Policy',
                    description: 'Локальный дубль общего термина.'
                }
            ]
        })

        expect(() => readDocsTermItems(i18n, 'page.glossary.terms')).toThrow(
            '[docs.i18n] local shared-term duplicate is forbidden.'
        )
    })

    test('allows canonical owner definition when item id matches shared registry id', () => {
        const i18n = createI18nStub({
            'page.glossary.terms': [
                {
                    id: 'landing-interop',
                    term: 'Interop',
                    description:
                        'Interop — canonical owner definition for the shared tooltip registry.\n\nWhat it shows:\nthis local item intentionally stays the owner description for the matching shared registry rule.\n\nHow to read it:\nwhen this definition changes, every page that uses the same owner term receives the updated meaning.'
                }
            ]
        })

        expect(readDocsTermItems(i18n, 'page.glossary.terms')).toEqual([
            {
                id: 'landing-interop',
                term: 'Interop',
                description:
                    'Interop — canonical owner definition for the shared tooltip registry.\n\nWhat it shows:\nthis local item intentionally stays the owner description for the matching shared registry rule.\n\nHow to read it:\nwhen this definition changes, every page that uses the same owner term receives the updated meaning.'
            }
        ])
    })

    test('throws when local docs term uses a short tooltip instead of full structured description', () => {
        const i18n = createI18nStub({
            'page.glossary.terms': [
                {
                    id: 'demo-endpoint',
                    term: 'endpoint',
                    description: 'HTTP точка входа.'
                }
            ]
        })

        expect(() => readDocsTermItems(i18n, 'page.glossary.terms')).toThrow(
            '[docs.i18n] term description must satisfy full-tooltip contract.'
        )
    })
})
