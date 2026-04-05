import { afterEach, describe, expect, test, vi } from 'vitest'

describe('reportSourceEndpoint', () => {
    afterEach(() => {
        vi.resetModules()
        vi.unmock('@/shared/configs/config')
    })

    async function loadResolver(apiBaseUrl: string) {
        vi.doMock('@/shared/configs/config', () => ({
            API_BASE_URL: apiBaseUrl
        }))

        const module = await import('./reportSourceEndpoint')
        return module.resolveReportSourceEndpoint
    }

    test('returns trimmed API base URL without extra routing logic', async () => {
        const resolveReportSourceEndpoint = await loadResolver('https://api.example.com/base///')

        expect(resolveReportSourceEndpoint()).toBe('https://api.example.com/base')
    })

    test('keeps same-origin api path as is', async () => {
        const resolveReportSourceEndpoint = await loadResolver('/api')

        expect(resolveReportSourceEndpoint()).toBe('/api')
    })

    test('throws when API base URL is empty', async () => {
        const resolveReportSourceEndpoint = await loadResolver('   ')

        expect(() => resolveReportSourceEndpoint()).toThrow('[report-source] API_BASE_URL is empty.')
    })
})
