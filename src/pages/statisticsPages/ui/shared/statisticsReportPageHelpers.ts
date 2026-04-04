import type {
    KeyValueItemDto,
    KeyValueSectionDto,
    ReportDocumentDto,
    ReportSectionDto
} from '@/shared/types/report.types'

export interface StatisticsSummaryCardLine {
    label: string
    value: string
}

export interface StatisticsSummaryCard {
    id: string
    title: string
    lines: StatisticsSummaryCardLine[]
}

export interface StatisticsProvidedTerm {
    key: string
    title: string
    description: string
    tooltip: string
}

export interface StatisticsProvidedTermDefinition {
    key: string
    titleDefault: string
    descriptionDefault: string
}

type StatisticsTranslate = (key: string, options?: Record<string, unknown>) => string

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

export function findKeyValueSection(
    report: ReportDocumentDto | undefined,
    sectionKey: string
): KeyValueSectionDto | null {
    if (!report) {
        return null
    }

    return report.sections.find(section => isKeyValueSection(section) && section.sectionKey === sectionKey) ?? null
}

export function resolveLine(
    item: KeyValueItemDto | undefined | null,
    fallbackLabel: string
): StatisticsSummaryCardLine | null {
    if (!item?.value) {
        return null
    }

    return {
        label: item.key || fallbackLabel,
        value: item.value
    }
}

export function extractItems(section: KeyValueSectionDto | null, itemKeys: string[]): KeyValueItemDto[] {
    if (!section?.items) {
        return []
    }

    return itemKeys
        .map(itemKey => section.items?.find(item => item.itemKey === itemKey) ?? null)
        .filter((item): item is KeyValueItemDto => Boolean(item))
}

export function buildProvidedTermsFromTranslations(
    translate: StatisticsTranslate,
    prefix: string,
    definitions: readonly StatisticsProvidedTermDefinition[]
): StatisticsProvidedTerm[] {
    return definitions.map(definition => ({
        key: definition.key,
        title: translate(`${prefix}.${definition.key}.title`, { defaultValue: definition.titleDefault }),
        description: translate(`${prefix}.${definition.key}.description`, {
            defaultValue: definition.descriptionDefault
        }),
        tooltip: translate(`${prefix}.${definition.key}.tooltip`, {
            defaultValue: definition.descriptionDefault
        })
    }))
}
