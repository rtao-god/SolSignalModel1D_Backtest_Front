import type { TableSectionDto } from '@/shared/types/report.types'

/*
    policyBranchMegaTabs — утилиты вкладок для Policy Branch Mega.

    Зачем:
        - Держит стабильные якоря (#policy-branch-section-N).
        - Нормализует заголовки без декоративных ===.
*/

export interface PolicyBranchMegaTabConfig {
    id: string
    label: string
    anchor: string
}

export type PolicyBranchMegaBucketMode = 'daily' | 'intraday' | 'delayed' | 'total'

const BUCKET_QUERY_ALIASES: Record<string, PolicyBranchMegaBucketMode> = {
    daily: 'daily',
    day: 'daily',
    intraday: 'intraday',
    intra: 'intraday',
    delayed: 'delayed',
    delay: 'delayed',
    total: 'total',
    sum: 'total',
    all: 'total',
    'all-buckets': 'total',
    'sum-buckets': 'total',
    'total-buckets': 'total'
}

// Убираем декоративные символы отчёта, чтобы заголовок читался на фронте.
export function normalizePolicyBranchMegaTitle(title: string | undefined): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}

// Разбираем bucket-параметр из query (bucket=...).
export function resolvePolicyBranchMegaBucketFromQuery(
    raw: string | null | undefined,
    fallback: PolicyBranchMegaBucketMode
): PolicyBranchMegaBucketMode {
    if (!raw) return fallback

    const key = raw.trim().toLowerCase()
    if (!key) return fallback

    const mapped = BUCKET_QUERY_ALIASES[key]
    if (!mapped) {
        throw new Error(`[policy-branch-mega] unknown bucket query: ${raw}`)
    }

    return mapped
}

// Пытаемся извлечь bucket-метку из заголовка секции.
export function resolvePolicyBranchMegaBucketFromTitle(title: string | undefined): PolicyBranchMegaBucketMode | null {
    if (!title) return null

    const normalized = normalizePolicyBranchMegaTitle(title).toLowerCase()
    if (!normalized) return null

    const bracketMatch =
        normalized.match(/\[(daily|intraday|delayed|total|all|sum)\]/i) ??
        normalized.match(/\((daily|intraday|delayed|total|all|sum)\)/i)

    if (bracketMatch?.[1]) {
        const token = bracketMatch[1].toLowerCase()
        if (token === 'daily') return 'daily'
        if (token === 'intraday') return 'intraday'
        if (token === 'delayed') return 'delayed'
        if (token === 'total' || token === 'all' || token === 'sum') return 'total'
    }

    const hasDaily = /\bdaily\b/i.test(normalized)
    const hasIntraday = /\bintraday\b/i.test(normalized)
    const hasDelayed = /\bdelayed\b/i.test(normalized)
    const hasTotal =
        /\b(all buckets|sum buckets|total buckets|combined buckets)\b/i.test(normalized) ||
        /\bbuckets?\b.*\b(all|sum|total|combined)\b/i.test(normalized)

    const matches: PolicyBranchMegaBucketMode[] = []
    if (hasDaily) matches.push('daily')
    if (hasIntraday) matches.push('intraday')
    if (hasDelayed) matches.push('delayed')
    if (hasTotal) matches.push('total')

    if (matches.length > 1) {
        throw new Error(`[policy-branch-mega] bucket tag is ambiguous: ${title}`)
    }

    return matches.length === 1 ? matches[0] : null
}

// Фильтруем секции по bucket-режиму (daily/intraday/delayed/total).
export function filterPolicyBranchMegaSectionsByBucketOrThrow(
    sections: TableSectionDto[],
    bucket: PolicyBranchMegaBucketMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] report has no sections.')
    }

    const tagged = sections.map(section => ({
        section,
        bucket: resolvePolicyBranchMegaBucketFromTitle(section.title)
    }))

    const hasAnyTag = tagged.some(item => item.bucket !== null)

    if (!hasAnyTag) {
        if (bucket === 'total') {
            return sections
        }

        throw new Error(`[policy-branch-mega] bucket sections are missing for ${bucket}.`)
    }

    if (tagged.some(item => item.bucket === null)) {
        throw new Error('[policy-branch-mega] mixed bucket tagging detected in report sections.')
    }

    const filtered = tagged.filter(item => item.bucket === bucket).map(item => item.section)

    if (filtered.length === 0) {
        throw new Error(`[policy-branch-mega] no sections found for bucket=${bucket}.`)
    }

    return filtered
}

// Пробуем вынуть номер части из заголовка "[PART 1/3]".
function extractPartNumber(title: string | undefined): number | null {
    if (!title) return null

    const normalized = normalizePolicyBranchMegaTitle(title)
    const partIndex = normalized.toLowerCase().indexOf('[part')
    if (partIndex < 0) return null

    const slashIndex = normalized.indexOf('/', partIndex)
    const endIndex = normalized.indexOf(']', partIndex)
    if (slashIndex < 0 || endIndex < 0 || slashIndex > endIndex) return null

    const numberStart = normalized.indexOf(' ', partIndex)
    if (numberStart < 0 || numberStart > slashIndex) return null

    const raw = normalized.slice(numberStart, slashIndex).trim()
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null

    return parsed
}

// Режим нужен, чтобы вкладки не смешивали WITH SL и NO SL.
function resolveModePrefix(title: string | undefined): string {
    if (!title) return ''

    const normalized = normalizePolicyBranchMegaTitle(title).toUpperCase()
    if (normalized.includes('NO SL')) return 'NO SL · '
    if (normalized.includes('WITH SL')) return 'WITH SL · '

    return ''
}

// Финальная подпись вкладки (если номер части распознан, используем его).
function resolvePartLabel(title: string | undefined, index: number): string {
    const part = extractPartNumber(title)
    const modePrefix = resolveModePrefix(title)
    if (part) {
        return `${modePrefix}Часть ${part}/3`
    }

    const normalized = normalizePolicyBranchMegaTitle(title)
    if (normalized) return `${modePrefix}${normalized}`

    return `${modePrefix}Секция ${index + 1}`
}

// Формируем вкладки/якоря по секциям отчёта.
export function buildPolicyBranchMegaTabsFromSections(sections: TableSectionDto[]): PolicyBranchMegaTabConfig[] {
    return sections.map((section, index) => {
        const id = `policy-branch-section-${index + 1}`
        const anchor = id
        const label = resolvePartLabel(section.title, index)

        return {
            id,
            label,
            anchor
        }
    })
}
