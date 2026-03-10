import { ReactNode } from 'react'

export interface TermTooltipContextRule {
    blockedBeforeWords?: string[]
    blockedAfterWords?: string[]
}

export interface TermTooltipRegistryEntry {
    id: string
    title?: string
    description: ReactNode | (() => ReactNode)
    aliases: string[]
    priority: number
    contexts?: TermTooltipContextRule
    excludeSelf?: boolean
    pattern?: RegExp
}

interface WordToken {
    raw: string
    normalized: string
    start: number
    end: number
}

interface AliasTrieNode {
    children: Map<string, AliasTrieNode>
    terminalRules: TermTooltipRegistryEntry[]
}

type MatchSource = 'alias' | 'regex'

export interface TermTooltipMatch {
    start: number
    end: number
    value: string
    rule: TermTooltipRegistryEntry
    source: MatchSource
}

const WORD_PATTERN = /[A-Za-zА-Яа-яЁё0-9$%_]+(?:[./-][A-Za-zА-Яа-яЁё0-9$%_]+)*/g

function normalizeWord(value: string): string {
    return value.toLowerCase().replace(/ё/g, 'е')
}

export function normalizeComparableTerm(value: string): string {
    return value
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[%$()[\]{}|/\\.,:;!?'"`~+-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function tokenizeWordsWithOffsets(text: string): WordToken[] {
    const result: WordToken[] = []
    const matcher = new RegExp(WORD_PATTERN.source, WORD_PATTERN.flags)
    let next = matcher.exec(text)

    while (next) {
        const raw = next[0]
        const start = next.index ?? 0
        result.push({
            raw,
            normalized: normalizeWord(raw),
            start,
            end: start + raw.length
        })
        next = matcher.exec(text)
    }

    return result
}

function tokenizeAliasWords(alias: string): string[] {
    return tokenizeWordsWithOffsets(alias)
        .map(token => token.normalized)
        .filter(token => token.length > 0)
}

function normalizeContextWords(words: string[] | undefined): Set<string> {
    return new Set((words ?? []).map(word => normalizeWord(word)).filter(word => word.length > 0))
}

function passesContextRules(
    rule: TermTooltipRegistryEntry,
    tokens: WordToken[],
    startTokenIndex: number,
    endTokenIndex: number
): boolean {
    const beforeWord = startTokenIndex > 0 ? (tokens[startTokenIndex - 1]?.normalized ?? '') : ''
    const afterWord = endTokenIndex < tokens.length - 1 ? (tokens[endTokenIndex + 1]?.normalized ?? '') : ''

    const blockedBefore = normalizeContextWords(rule.contexts?.blockedBeforeWords)
    const blockedAfter = normalizeContextWords(rule.contexts?.blockedAfterWords)

    if (beforeWord && blockedBefore.has(beforeWord)) {
        return false
    }

    if (afterWord && blockedAfter.has(afterWord)) {
        return false
    }

    return true
}

function buildAliasTrie(registry: TermTooltipRegistryEntry[]): AliasTrieNode {
    const root: AliasTrieNode = {
        children: new Map<string, AliasTrieNode>(),
        terminalRules: []
    }

    registry.forEach(rule => {
        rule.aliases.forEach(alias => {
            const tokens = tokenizeAliasWords(alias)
            if (tokens.length === 0) {
                return
            }

            let node = root
            tokens.forEach(token => {
                const next = node.children.get(token)
                if (next) {
                    node = next
                    return
                }

                const created: AliasTrieNode = {
                    children: new Map<string, AliasTrieNode>(),
                    terminalRules: []
                }
                node.children.set(token, created)
                node = created
            })

            if (!node.terminalRules.some(existing => existing.id === rule.id)) {
                node.terminalRules.push(rule)
            }
        })
    })

    return root
}

function collectAliasMatches(
    text: string,
    tokens: WordToken[],
    registry: TermTooltipRegistryEntry[],
    excludedRuleIds: Set<string>,
    excludedTerms: Set<string>
): TermTooltipMatch[] {
    const matches: TermTooltipMatch[] = []
    const trie = buildAliasTrie(registry)

    for (let startIndex = 0; startIndex < tokens.length; startIndex += 1) {
        let node = trie

        for (let endIndex = startIndex; endIndex < tokens.length; endIndex += 1) {
            const token = tokens[endIndex]
            const nextNode = node.children.get(token.normalized)
            if (!nextNode) {
                break
            }
            node = nextNode

            if (node.terminalRules.length === 0) {
                continue
            }

            node.terminalRules.forEach(rule => {
                if (excludedRuleIds.has(rule.id)) {
                    return
                }

                if (!passesContextRules(rule, tokens, startIndex, endIndex)) {
                    return
                }

                const start = tokens[startIndex].start
                const end = tokens[endIndex].end
                const value = text.slice(start, end)
                const normalizedValue = normalizeComparableTerm(value)
                if (normalizedValue.length > 0 && excludedTerms.has(normalizedValue)) {
                    return
                }

                matches.push({
                    start,
                    end,
                    value,
                    rule,
                    source: 'alias'
                })
            })
        }
    }

    return matches
}

function isSingleWordToken(value: string): boolean {
    return /^[A-Za-zА-Яа-яЁё0-9_]+$/.test(value)
}

function isWordChar(value: string): boolean {
    return /[A-Za-zА-Яа-яЁё0-9_]/.test(value)
}

function expandMatchToWholeWord(text: string, start: number, value: string): { start: number; value: string } | null {
    if (!isSingleWordToken(value)) {
        return null
    }

    let expandedStart = start
    let expandedEnd = start + value.length

    while (expandedStart > 0 && isWordChar(text[expandedStart - 1])) {
        expandedStart -= 1
    }

    while (expandedEnd < text.length && isWordChar(text[expandedEnd])) {
        expandedEnd += 1
    }

    if (expandedStart === start && expandedEnd === start + value.length) {
        return null
    }

    return {
        start: expandedStart,
        value: text.slice(expandedStart, expandedEnd)
    }
}

function isLowerCaseCyrillicSuffix(value: string): boolean {
    return /^[а-яё]+$/i.test(value) && value === value.toLocaleLowerCase('ru-RU')
}

function isLowerCaseAsciiSuffix(value: string): boolean {
    return /^[a-z]+$/.test(value) && value === value.toLowerCase()
}

function isSafeExpandedRegexWord(rawValue: string, rawStart: number, expandedStart: number, expandedValue: string): boolean {
    if (expandedStart !== rawStart) {
        return false
    }

    const suffix = expandedValue.slice(rawValue.length)
    if (!suffix) {
        return true
    }

    // Разрешаем только словоформенные окончания. CamelCase, snake_case и длинные ASCII-склейки
    // считаются отдельными техническими токенами и не должны автолинковаться как вложенный термин.
    if (isLowerCaseCyrillicSuffix(suffix)) {
        return true
    }

    return isLowerCaseAsciiSuffix(suffix) && suffix.length <= 2
}

function findTokenRangeByCharRange(tokens: WordToken[], start: number, endExclusive: number): [number, number] | null {
    let startIndex = -1
    let endIndex = -1

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index]
        if (token.end <= start) {
            continue
        }

        if (token.start >= endExclusive) {
            break
        }

        if (startIndex === -1) {
            startIndex = index
        }
        endIndex = index
    }

    if (startIndex === -1 || endIndex === -1) {
        return null
    }

    return [startIndex, endIndex]
}

function collectRegexMatches(
    text: string,
    tokens: WordToken[],
    registry: TermTooltipRegistryEntry[],
    excludedRuleIds: Set<string>,
    excludedTerms: Set<string>
): TermTooltipMatch[] {
    const matches: TermTooltipMatch[] = []

    registry.forEach(rule => {
        if (excludedRuleIds.has(rule.id) || !rule.pattern) {
            return
        }

        const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`
        const matcher = new RegExp(rule.pattern.source, flags)
        let next = matcher.exec(text)

        while (next) {
            const rawValue = next[0] ?? ''
            if (!rawValue) {
                if (matcher.lastIndex === next.index) {
                    matcher.lastIndex += 1
                }
                next = matcher.exec(text)
                continue
            }

            let start = next.index ?? 0
            let value = rawValue

            const expanded = expandMatchToWholeWord(text, start, value)
            if (expanded) {
                if (!isSafeExpandedRegexWord(value, start, expanded.start, expanded.value)) {
                    next = matcher.exec(text)
                    continue
                }

                start = expanded.start
                value = expanded.value
            }

            const end = start + value.length
            const normalizedValue = normalizeComparableTerm(value)
            if (normalizedValue.length > 0 && excludedTerms.has(normalizedValue)) {
                next = matcher.exec(text)
                continue
            }

            const tokenRange = findTokenRangeByCharRange(tokens, start, end)
            if (tokenRange && !passesContextRules(rule, tokens, tokenRange[0], tokenRange[1])) {
                next = matcher.exec(text)
                continue
            }

            matches.push({
                start,
                end,
                value,
                rule,
                source: 'regex'
            })

            next = matcher.exec(text)
        }
    })

    return matches
}

function compareMatches(a: TermTooltipMatch, b: TermTooltipMatch): number {
    if (a.start !== b.start) {
        return a.start - b.start
    }

    const aLength = a.end - a.start
    const bLength = b.end - b.start
    if (aLength !== bLength) {
        return bLength - aLength
    }

    if (a.rule.priority !== b.rule.priority) {
        return b.rule.priority - a.rule.priority
    }

    if (a.source !== b.source) {
        return a.source === 'alias' ? -1 : 1
    }

    return a.rule.id.localeCompare(b.rule.id)
}

function resolveMatches(matches: TermTooltipMatch[]): TermTooltipMatch[] {
    const sorted = [...matches].sort(compareMatches)
    const selected: TermTooltipMatch[] = []
    const seen = new Set<string>()

    sorted.forEach(match => {
        const key = `${match.rule.id}:${match.start}:${match.end}`
        if (seen.has(key)) {
            return
        }
        seen.add(key)

        const hasOverlap = selected.some(existing => !(match.end <= existing.start || match.start >= existing.end))
        if (hasOverlap) {
            return
        }

        selected.push(match)
    })

    return selected.sort((a, b) => a.start - b.start)
}

export function matchTermTooltips(
    text: string,
    registry: TermTooltipRegistryEntry[],
    excludedRuleIds: Set<string>,
    excludedTerms: Set<string>
): TermTooltipMatch[] {
    if (!text || registry.length === 0) {
        return []
    }

    const tokens = tokenizeWordsWithOffsets(text)
    if (tokens.length === 0) {
        return []
    }

    const aliasMatches = collectAliasMatches(text, tokens, registry, excludedRuleIds, excludedTerms)
    const regexMatches = collectRegexMatches(text, tokens, registry, excludedRuleIds, excludedTerms)

    return resolveMatches([...aliasMatches, ...regexMatches])
}
