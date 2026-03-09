import { normalizeComparableTerm, type TermTooltipRegistryEntry } from './termTooltipMatcher'

export interface TermTooltipRegistryDuplicateIdIssue {
    type: 'duplicate-id'
    ruleId: string
}

export interface TermTooltipRegistryAliasCollisionIssue {
    type: 'alias-collision'
    comparableLabel: string
    label: string
    existingRuleId: string
    conflictingRuleId: string
}

export type TermTooltipRegistryIssue = TermTooltipRegistryDuplicateIdIssue | TermTooltipRegistryAliasCollisionIssue

export interface SafeTermTooltipRegistryResult {
    registry: TermTooltipRegistryEntry[]
    issues: TermTooltipRegistryIssue[]
}

function cloneRegistryEntry(rule: TermTooltipRegistryEntry, aliases: string[]): TermTooltipRegistryEntry {
    return {
        ...rule,
        aliases
    }
}

export function formatTermTooltipRegistryIssue(issue: TermTooltipRegistryIssue): string {
    if (issue.type === 'duplicate-id') {
        return `[term-tooltip] duplicate rule id detected: ${issue.ruleId}.`
    }

    return `[term-tooltip] alias collision detected for "${issue.comparableLabel}": ${issue.existingRuleId} vs ${issue.conflictingRuleId}.`
}

export function buildSafeTermTooltipRegistry(
    registry: TermTooltipRegistryEntry[]
): SafeTermTooltipRegistryResult {
    const issues: TermTooltipRegistryIssue[] = []
    const ids = new Set<string>()
    const comparableLabelsToIds = new Map<string, string>()
    const safeRegistry: TermTooltipRegistryEntry[] = []

    registry.forEach(rule => {
        if (ids.has(rule.id)) {
            issues.push({
                type: 'duplicate-id',
                ruleId: rule.id
            })
            return
        }

        ids.add(rule.id)

        const safeAliases: string[] = []
        const localComparableLabels = new Set<string>()

        rule.aliases.forEach(alias => {
            const normalizedAlias = normalizeComparableTerm(alias ?? '')
            if (!normalizedAlias || localComparableLabels.has(normalizedAlias)) {
                return
            }

            const existingRuleId = comparableLabelsToIds.get(normalizedAlias)
            if (existingRuleId && existingRuleId !== rule.id) {
                issues.push({
                    type: 'alias-collision',
                    comparableLabel: normalizedAlias,
                    label: alias,
                    existingRuleId,
                    conflictingRuleId: rule.id
                })
                return
            }

            comparableLabelsToIds.set(normalizedAlias, rule.id)
            localComparableLabels.add(normalizedAlias)
            safeAliases.push(alias)
        })

        safeRegistry.push(cloneRegistryEntry(rule, safeAliases))
    })

    return {
        registry: safeRegistry,
        issues
    }
}
