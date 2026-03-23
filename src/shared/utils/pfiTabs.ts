import type { PfiReportSectionDto, PfiScoreScopeKeyDto } from '@/shared/types/pfi.types'

export interface PfiTabConfig {
    id: string
    label: string
    anchor: string
    routePath?: string
}

const PFI_SCOPE_LABELS: Record<PfiScoreScopeKeyDto, string> = {
    train_oof: 'Train OOF',
    oos: 'OOS',
    train: 'Train',
    full_history: 'Full history'
}

function normalizeAnchorToken(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    return normalized.length > 0 ? normalized : 'section'
}

function resolveScopeLabel(scopeKey: PfiScoreScopeKeyDto): string {
    return PFI_SCOPE_LABELS[scopeKey] ?? scopeKey
}

/**
 * Табы PFI строятся только по typed metadata секции.
 * Display title остаётся текстом карточки и не участвует в идентичности маршрута.
 */
export function buildPfiTabsFromSections(sections: PfiReportSectionDto[]): PfiTabConfig[] {
    const sectionCountByModelKey = sections.reduce(
        (acc, section) => acc.set(section.modelKey, (acc.get(section.modelKey) ?? 0) + 1),
        new Map<string, number>()
    )
    const sectionCountByModelScopeKey = sections.reduce((acc, section) => {
        const modelScopeKey = `${section.modelKey}::${section.scoreScopeKey}`
        acc.set(modelScopeKey, (acc.get(modelScopeKey) ?? 0) + 1)
        return acc
    }, new Map<string, number>())

    return sections.map((section, index) => {
        const modelScopeKey = `${section.modelKey}::${section.scoreScopeKey}`
        const labelParts = [section.modelDisplayName?.trim() || `Модель ${index + 1}`]

        if ((sectionCountByModelKey.get(section.modelKey) ?? 0) > 1) {
            labelParts.push(resolveScopeLabel(section.scoreScopeKey))
        }

        if (section.thresholdLabel && (sectionCountByModelScopeKey.get(modelScopeKey) ?? 0) > 1) {
            labelParts.push(section.thresholdLabel)
        }

        return {
            id: section.sectionKey,
            label: labelParts.join(' · '),
            anchor: `pfi-${normalizeAnchorToken(section.sectionKey)}`
        }
    })
}
