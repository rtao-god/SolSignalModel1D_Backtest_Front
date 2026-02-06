/*
    backtestDiagnosticsSections — распределение таблиц по страницам.

    Зачем:
        - Гарантирует, что все таблицы из отчёта попадут на фронт.
        - Разделяет «рейтинги», «диагностики» и «статистику по дням».
*/

import type { TableSectionDto } from '@/shared/types/report.types'

export type BacktestDiagnosticsCategory = 'ratings' | 'diagnostics' | 'dayStats' | 'unknown'

interface CategoryRules {
    category: BacktestDiagnosticsCategory
    rules: RegExp[]
}

const CATEGORY_RULES: CategoryRules[] = [
    {
        category: 'ratings',
        rules: [
            /^Top \d+ trades by NetPnlUsd/i,
            /^Top \d+ trades by NetReturnPct/i,
            /^Top Trade Days \(BEST/i,
            /^Top Trade Days \(WORST/i,
            /^Equity\/DD Summary/i
        ]
    },
    {
        category: 'dayStats',
        rules: [
            /^Market DayType Distribution/i,
            /^Policy PnL by DayType/i,
            /^Policy NoTrade\/Opportunity by DayType/i,
            /^Policy WinRate by DayType/i,
            /^Policy Opposite-Direction by DayType/i,
            /^Policy Opposite-Direction \(ALL HISTORY/i,
            /^Policy NoTrade by Weekday/i,
            /^Policy NoTrade Reasons/i,
            /^Пропуски по дням/i,
            /^Missing Weekday Details/i,
            /^Data Integrity \(Record Days\)/i
        ]
    }
]

function normalizeReportTitle(title: string): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}

function classifyTitle(title: string): BacktestDiagnosticsCategory {
    const normalized = normalizeReportTitle(title)
    for (const group of CATEGORY_RULES) {
        if (group.rules.some(r => r.test(normalized))) {
            return group.category
        }
    }
    return 'diagnostics'
}

export interface BacktestDiagnosticsSectionsSplit {
    ratings: TableSectionDto[]
    diagnostics: TableSectionDto[]
    dayStats: TableSectionDto[]
    unknown: TableSectionDto[]
}

export interface DiagnosticsTabConfig {
    id: string
    label: string
    anchor: string
}

export interface DiagnosticsSectionRef {
    section: TableSectionDto
    index: number
}

export type DiagnosticsGroupId = 'risk' | 'guardrail' | 'decisions' | 'hotspots' | 'other'

export interface DiagnosticsTabGroup {
    id: DiagnosticsGroupId
    label: string
    tabs: DiagnosticsTabConfig[]
}

// Раскладываем секции отчёта по категориям, сохраняя порядок.
export function splitBacktestDiagnosticsSections(sections: TableSectionDto[]): BacktestDiagnosticsSectionsSplit {
    const result: BacktestDiagnosticsSectionsSplit = {
        ratings: [],
        diagnostics: [],
        dayStats: [],
        unknown: []
    }

    for (const section of sections) {
        const category = classifyTitle(section.title ?? '')
        if (category === 'ratings') {
            result.ratings.push(section)
            continue
        }
        if (category === 'dayStats') {
            result.dayStats.push(section)
            continue
        }
        if (category === 'diagnostics') {
            result.diagnostics.push(section)
            continue
        }
        result.unknown.push(section)
    }

    return result
}

const MAX_TAB_LABEL = 64

function trimTabLabel(title: string, index: number): string {
    const normalized = normalizeReportTitle(title)
    const base = normalized && normalized.length > 0 ? normalized : `Секция ${index + 1}`
    if (base.length <= MAX_TAB_LABEL) {
        return base
    }
    return `${base.slice(0, MAX_TAB_LABEL - 1)}…`
}

export function toDiagnosticsSectionRefs(sections: TableSectionDto[]): DiagnosticsSectionRef[] {
    return sections.map((section, index) => ({ section, index }))
}

/*
    Собирает вкладки для сайдбара под страницы диагностики/анализа.
    Якоря должны совпадать с BacktestDiagnosticsPageLayout (diag-section-N).
*/
export function buildDiagnosticsTabsFromSections(sections: DiagnosticsSectionRef[]): DiagnosticsTabConfig[] {
    return sections.map(ref => {
        const id = `diag-section-${ref.index + 1}`
        const anchor = id
        const label = trimTabLabel(ref.section.title ?? '', ref.index)

        return {
            id,
            label,
            anchor
        }
    })
}

interface DiagnosticsGroupRules {
    id: DiagnosticsGroupId
    label: string
    rules: RegExp[]
}

const DIAGNOSTICS_GROUP_RULES: DiagnosticsGroupRules[] = [
    {
        id: 'risk',
        label: 'Риск/ликвидации',
        rules: [
            /^Policy Branch RiskDay/i,
            /^Equity\/DD Summary/i,
            /^Trade Duration \/ MAE \/ MFE/i,
            /^Liquidation Distance/i,
            /^Liquidation Summary/i,
            /^Policy Commission \/ Leverage Sanity/i,
            /^Policy Leverage\/Cap Quantiles/i
        ]
    },
    {
        id: 'guardrail',
        label: 'Guardrail/Specificity',
        rules: [
            /^Guardrail Confusion/i,
            /^Specificity Rolling Guardrail/i,
            /^Specificity Global Thresholds/i,
            /^Policy Specificity Split/i
        ]
    },
    {
        id: 'decisions',
        label: 'Решения/Blame',
        rules: [
            /^Decision Attribution/i,
            /^Model vs Policy Blame Split/i,
            /^Top Decision Days/i
        ]
    },
    {
        id: 'hotspots',
        label: 'Hotspots/NoTrade',
        rules: [
            /^Policy Low-Coverage Hotspots/i,
            /^Policy NoTrade Hotspots/i,
            /^Policy Opposite Hotspots/i
        ]
    }
]

function classifyDiagnosticsGroup(title: string): DiagnosticsGroupRules | null {
    const normalized = normalizeReportTitle(title)
    for (const group of DIAGNOSTICS_GROUP_RULES) {
        if (group.rules.some(rule => rule.test(normalized))) {
            return group
        }
    }
    return null
}

export function splitDiagnosticsTabGroups(sections: DiagnosticsSectionRef[]): DiagnosticsTabGroup[] {
    const map = new Map<string, DiagnosticsTabConfig[]>()

    for (const group of DIAGNOSTICS_GROUP_RULES) {
        map.set(group.id, [])
    }
    map.set('other', [])

    for (const ref of sections) {
        const group = classifyDiagnosticsGroup(ref.section.title ?? '')
        const tab: DiagnosticsTabConfig = {
            id: `diag-section-${ref.index + 1}`,
            anchor: `diag-section-${ref.index + 1}`,
            label: trimTabLabel(ref.section.title ?? '', ref.index)
        }

        if (group) {
            map.get(group.id)!.push(tab)
        } else {
            map.get('other')!.push(tab)
        }
    }

    const result: DiagnosticsTabGroup[] = []
    for (const group of DIAGNOSTICS_GROUP_RULES) {
        const tabs = map.get(group.id) ?? []
        if (tabs.length > 0) {
            result.push({ id: group.id, label: group.label, tabs })
        }
    }

    const otherTabs = map.get('other') ?? []
    if (otherTabs.length > 0) {
        result.push({ id: 'other', label: 'Прочее', tabs: otherTabs })
    }

    return result
}

export interface DiagnosticsSectionGroup {
    id: DiagnosticsGroupId
    label: string
    sections: TableSectionDto[]
}

export function splitDiagnosticsSectionGroups(sections: TableSectionDto[]): DiagnosticsSectionGroup[] {
    const map = new Map<string, TableSectionDto[]>()

    for (const group of DIAGNOSTICS_GROUP_RULES) {
        map.set(group.id, [])
    }
    map.set('other', [])

    for (const section of sections) {
        const group = classifyDiagnosticsGroup(section.title ?? '')
        if (group) {
            map.get(group.id)!.push(section)
        } else {
            map.get('other')!.push(section)
        }
    }

    const result: DiagnosticsSectionGroup[] = []
    for (const group of DIAGNOSTICS_GROUP_RULES) {
        const groupedSections = map.get(group.id) ?? []
        if (groupedSections.length > 0) {
            result.push({ id: group.id, label: group.label, sections: groupedSections })
        }
    }

    const otherSections = map.get('other') ?? []
    if (otherSections.length > 0) {
        result.push({ id: 'other', label: 'Прочее', sections: otherSections })
    }

    return result
}

export function getDiagnosticsGroupSections(
    sections: TableSectionDto[],
    groupId: DiagnosticsGroupId
): TableSectionDto[] {
    if (sections.length === 0) return []

    const groups = splitDiagnosticsSectionGroups(sections)
    const group = groups.find(item => item.id === groupId)
    return group?.sections ?? []
}
