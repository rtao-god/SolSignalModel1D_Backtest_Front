import { normalizeComparableTerm } from '@/shared/ui/TermTooltip/lib/termTooltipMatcher'
import { COMMON_TERM_TOOLTIP_REGISTRY } from './common'
import { logError } from '@/shared/lib/logging/logError'

function collectComparableLabels(
    termTitle: string | undefined,
    aliases: string[] | undefined,
    autolink: boolean | undefined
): string[] {
    if (autolink === false) {
        return []
    }

    return [termTitle, ...(aliases ?? [])]
        .map(label => normalizeComparableTerm(label ?? ''))
        .filter(label => label.length > 0)
}

function collectSharedTermRegistryIssues(): Error[] {
    const ids = new Set<string>()
    const labelsToIds = new Map<string, string>()
    const issues: Error[] = []

    COMMON_TERM_TOOLTIP_REGISTRY.forEach(term => {
        if (ids.has(term.id)) {
            issues.push(new Error(`[shared-terms] duplicate term id: ${term.id}.`))
            return
        }

        ids.add(term.id)

        collectComparableLabels(term.title, term.aliases, term.autolink).forEach(label => {
            const existingId = labelsToIds.get(label)
            if (existingId && existingId !== term.id) {
                issues.push(
                    new Error(
                        `[shared-terms] alias collision: "${label}" is used by both ${existingId} and ${term.id}.`
                    )
                )
                return
            }

            labelsToIds.set(label, term.id)
        })
    })

    return issues
}

const SHARED_TERM_REGISTRY_ISSUES = collectSharedTermRegistryIssues()
let didReportSharedTermRegistryIssues = false

function reportSharedTermRegistryIssues(): void {
    if (didReportSharedTermRegistryIssues || SHARED_TERM_REGISTRY_ISSUES.length === 0) {
        return
    }

    didReportSharedTermRegistryIssues = true
    SHARED_TERM_REGISTRY_ISSUES.forEach(issue => {
        logError(issue, undefined, {
            source: 'shared-terms-registry',
            domain: 'app_runtime',
            severity: 'warning'
        })
    })
}

export function resolveSharedTermSelfAliases(termId: string): string[] {
    reportSharedTermRegistryIssues()

    const resolved = COMMON_TERM_TOOLTIP_REGISTRY.find(term => term.id === termId)
    if (!resolved) {
        throw new Error(`[shared-terms] unknown term id: ${termId}.`)
    }

    return Array.from(
        new Set([resolved.title, ...(resolved.aliases ?? [])].map(value => value?.trim() ?? '').filter(Boolean))
    )
}
