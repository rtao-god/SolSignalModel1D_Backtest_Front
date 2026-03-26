import { describe, expect, test } from 'vitest'
import i18next from 'i18next'
import { readDeveloperTermItems } from './developerI18n'

function createI18n(resources: Record<string, unknown>) {
    const instance = i18next.createInstance()

    instance.init({
        lng: 'ru',
        fallbackLng: false,
        resources: {
            ru: {
                developer: resources
            }
        }
    })

    return instance
}

describe('developerI18n', () => {
    test('resolves shared term label from canonical registry when sharedTermId is provided', () => {
        const i18n = createI18n({
            'page.sections.demo.terms': [{ id: 'demo-leakage', sharedTermId: 'leakage' }]
        })

        expect(readDeveloperTermItems(i18n, 'page.sections.demo.terms')).toEqual([
            { id: 'demo-leakage', term: 'Leakage', sharedTermId: 'leakage' }
        ])
    })

    test('throws when sharedTermId is mixed with local duplicate description', () => {
        const i18n = createI18n({
            'page.sections.demo.terms': [
                {
                    id: 'demo-leakage',
                    term: 'leakage',
                    sharedTermId: 'leakage',
                    description: 'Локальный дубль не допускается.'
                }
            ]
        })

        expect(() => readDeveloperTermItems(i18n, 'page.sections.demo.terms')).toThrow(
            '[developer.i18n] shared term must not duplicate local description.'
        )
    })

    test('throws when local developer term duplicates shared canonical tooltip without sharedTermId', () => {
        const i18n = createI18n({
            'page.sections.demo.terms': [
                {
                    id: 'demo-leakage',
                    term: 'leakage',
                    description: 'Локальный текст'
                }
            ]
        })

        expect(() => readDeveloperTermItems(i18n, 'page.sections.demo.terms')).toThrow(
            '[developer.i18n] local shared-term duplicate is forbidden.'
        )
    })

    test('throws when local developer term uses a short tooltip instead of full structured description', () => {
        const i18n = createI18n({
            'page.sections.demo.terms': [
                {
                    id: 'demo-endpoint',
                    term: 'endpoint',
                    description: 'HTTP точка входа.'
                }
            ]
        })

        expect(() => readDeveloperTermItems(i18n, 'page.sections.demo.terms')).toThrow(
            '[developer.i18n] term description must satisfy full-tooltip contract.'
        )
    })
})
