import { matchTermTooltips, type TermTooltipRegistryEntry } from './termTooltipMatcher'

function createRegexRule(id: string, title: string, pattern: RegExp): TermTooltipRegistryEntry {
    return {
        id,
        title,
        description: `${id} description`,
        aliases: [title],
        priority: 100,
        pattern
    }
}

describe('term tooltip matcher', () => {
    test('does not match regex terms inside camel case token without separators', () => {
        const registry = [
            createRegexRule('policy', 'Policy', /Policy/i),
            createRegexRule('branch', 'Branch', /Branch/i)
        ]

        const matches = matchTermTooltips('PolicyBranchMega', registry, new Set<string>(), new Set<string>())

        expect(matches).toEqual([])
    })

    test('does not match regex terms inside lowercase glued token without separators', () => {
        const registry = [createRegexRule('bucket', 'Bucket', /bucket/i)]

        const matches = matchTermTooltips('bucketmode', registry, new Set<string>(), new Set<string>())

        expect(matches).toEqual([])
    })

    test('does not match regex terms that start inside a larger token', () => {
        const registry = [createRegexRule('pnl', 'PnL', /PnL/i)]

        const matches = matchTermTooltips('NetPnl$', registry, new Set<string>(), new Set<string>())

        expect(matches).toEqual([])
    })

    test('keeps whole-word expansion for normal russian word forms', () => {
        const registry = [
            createRegexRule('liquidation', 'Ликвидация', /ликвидац/i),
            createRegexRule('margin', 'Залог', /залог/i)
        ]

        const matches = matchTermTooltips(
            'ликвидационная свеча съела залогу часть капитала',
            registry,
            new Set<string>(),
            new Set<string>()
        )

        expect(matches.map(match => ({ id: match.rule.id, value: match.value }))).toEqual([
            { id: 'liquidation', value: 'ликвидационная' },
            { id: 'margin', value: 'залогу' }
        ])
    })
})
