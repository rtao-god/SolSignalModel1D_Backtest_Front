import type { TermTooltipRegistryEntry } from './termTooltipMatcher'
import { buildSafeTermTooltipRegistry, formatTermTooltipRegistryIssue } from './termTooltipRegistryIntegrity'

function createRegistryEntry(id: string, aliases: string[], title?: string): TermTooltipRegistryEntry {
    return {
        id,
        title,
        description: `${id} description`,
        aliases,
        priority: 100
    }
}

describe('term tooltip registry integrity', () => {
    test('drops colliding alias instead of throwing during registry build', () => {
        const result = buildSafeTermTooltipRegistry([
            createRegistryEntry('zonal-mode-term', ['ZONAL', 'with-zonal'], 'ZONAL'),
            createRegistryEntry('with-zonal-mode', ['WITH ZONAL', 'with-zonal'], 'WITH ZONAL')
        ])

        expect(result.issues).toHaveLength(1)
        expect(formatTermTooltipRegistryIssue(result.issues[0])).toContain('alias collision detected for "withzonal"')
        expect(result.registry).toEqual([
            expect.objectContaining({
                id: 'zonal-mode-term',
                aliases: ['ZONAL', 'with-zonal']
            }),
            expect.objectContaining({
                id: 'with-zonal-mode',
                aliases: ['WITH ZONAL']
            })
        ])
    })

    test('skips duplicate ids and keeps first valid rule', () => {
        const result = buildSafeTermTooltipRegistry([
            createRegistryEntry('policy', ['Policy']),
            createRegistryEntry('policy', ['Trading policy'])
        ])

        expect(result.issues).toEqual([
            expect.objectContaining({
                type: 'duplicate-id',
                ruleId: 'policy'
            })
        ])
        expect(result.registry).toHaveLength(1)
        expect(result.registry[0].aliases).toEqual(['Policy'])
    })
})
