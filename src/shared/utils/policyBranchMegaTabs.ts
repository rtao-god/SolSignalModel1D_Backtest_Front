import type { TableSectionDto } from '@/shared/types/report.types'

export interface PolicyBranchMegaTabConfig {
    id: string
    label: string
    anchor: string
}

export type PolicyBranchMegaBucketMode = 'daily' | 'intraday' | 'delayed' | 'total'
export type PolicyBranchMegaMetricMode = 'real' | 'no-biggest-liq-loss'
export type PolicyBranchMegaTpSlMode = 'all' | 'dynamic' | 'static'
export type PolicyBranchMegaZonalMode = 'with-zonal' | 'without-zonal'

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

const METRIC_QUERY_ALIASES: Record<string, PolicyBranchMegaMetricMode> = {
    real: 'real',
    default: 'real',
    base: 'real',
    noliq: 'no-biggest-liq-loss',
    no_liq: 'no-biggest-liq-loss',
    'no-liq': 'no-biggest-liq-loss',
    no_biggest_liq_loss: 'no-biggest-liq-loss',
    'no-biggest-liq-loss': 'no-biggest-liq-loss',
    nobiggestliqloss: 'no-biggest-liq-loss',
    stressless: 'no-biggest-liq-loss'
}

const TP_SL_QUERY_ALIASES: Record<string, PolicyBranchMegaTpSlMode> = {
    all: 'all',
    default: 'all',
    full: 'all',
    dynamic: 'dynamic',
    dyn: 'dynamic',
    confidence: 'dynamic',
    static: 'static',
    stat: 'static',
    baseline: 'static'
}

const ZONAL_QUERY_ALIASES: Record<string, PolicyBranchMegaZonalMode> = {
    with: 'with-zonal',
    on: 'with-zonal',
    enabled: 'with-zonal',
    zonal: 'with-zonal',
    'with-zonal': 'with-zonal',
    'with_zonal': 'with-zonal',
    without: 'without-zonal',
    off: 'without-zonal',
    disabled: 'without-zonal',
    nozonal: 'without-zonal',
    'without-zonal': 'without-zonal',
    'without_zonal': 'without-zonal'
}

export function normalizePolicyBranchMegaTitle(title: string | undefined): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}
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

export function resolvePolicyBranchMegaMetricFromQuery(
    raw: string | null | undefined,
    fallback: PolicyBranchMegaMetricMode
): PolicyBranchMegaMetricMode {
    if (!raw) return fallback

    const key = raw.trim().toLowerCase()
    if (!key) return fallback

    const mapped = METRIC_QUERY_ALIASES[key]
    if (!mapped) {
        throw new Error(`[policy-branch-mega] unknown metric query: ${raw}`)
    }

    return mapped
}

export function resolvePolicyBranchMegaTpSlModeFromQuery(
    raw: string | null | undefined,
    fallback: PolicyBranchMegaTpSlMode
): PolicyBranchMegaTpSlMode {
    if (!raw) return fallback

    const key = raw.trim().toLowerCase()
    if (!key) return fallback

    const mapped = TP_SL_QUERY_ALIASES[key]
    if (!mapped) {
        throw new Error(`[policy-branch-mega] unknown tpsl query: ${raw}`)
    }

    return mapped
}

export function resolvePolicyBranchMegaZonalModeFromQuery(
    raw: string | null | undefined,
    fallback: PolicyBranchMegaZonalMode
): PolicyBranchMegaZonalMode {
    if (!raw) return fallback

    const key = raw.trim().toLowerCase()
    if (!key) return fallback

    const mapped = ZONAL_QUERY_ALIASES[key]
    if (!mapped) {
        throw new Error(`[policy-branch-mega] unknown zonal query: ${raw}`)
    }

    return mapped
}

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

export function resolvePolicyBranchMegaMetricFromTitle(title: string | undefined): PolicyBranchMegaMetricMode | null {
    if (!title) return null

    const normalized = normalizePolicyBranchMegaTitle(title).toUpperCase()
    if (!normalized) return null

    if (normalized.includes('NO BIGGEST LIQ LOSS')) return 'no-biggest-liq-loss'
    if (normalized.includes('[REAL]')) return 'real'

    // Backward compatibility: old reports had no explicit metric tag and represent REAL.
    return 'real'
}

export function filterPolicyBranchMegaSectionsByBucketOrThrow(
    sections: TableSectionDto[],
    bucket: PolicyBranchMegaBucketMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] report has no sections.')
    }

    const metadataTagged = sections.map(section => ({
        section,
        bucket: tryResolvePolicyBranchMegaBucketFromMetadataOrNull(section)
    }))

    const metadataCount = metadataTagged.filter(item => item.bucket !== null).length

    const tagged =
        metadataCount === sections.length
            ? metadataTagged.map(item => ({ section: item.section, bucket: item.bucket! }))
            : sections.map(section => ({
                  section,
                  bucket: resolvePolicyBranchMegaBucketFromTitle(section.title)
              }))

    const hasAnyTag = tagged.some(item => item.bucket !== null)
    if (!hasAnyTag) {
        if (bucket === 'total' || bucket === 'daily') {
            return sections
        }
        return []
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

export function filterPolicyBranchMegaSectionsByMetricOrThrow(
    sections: TableSectionDto[],
    metric: PolicyBranchMegaMetricMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] report has no sections.')
    }

    const metadataTagged = sections.map(section => ({
        section,
        metric: tryResolvePolicyBranchMegaMetricFromMetadataOrNull(section)
    }))

    const metadataCount = metadataTagged.filter(item => item.metric !== null).length

    const tagged =
        metadataCount === sections.length
            ? metadataTagged.map(item => ({ section: item.section, metric: item.metric! }))
            : sections.map(section => ({
                  section,
                  metric: resolvePolicyBranchMegaMetricFromTitle(section.title)
              }))

    if (tagged.some(item => item.metric === null)) {
        throw new Error('[policy-branch-mega] mixed metric tagging detected in report sections.')
    }

    const filtered = tagged.filter(item => item.metric === metric).map(item => item.section)

    if (filtered.length === 0) {
        throw new Error(`[policy-branch-mega] no sections found for metric=${metric}.`)
    }

    return filtered
}

export function filterPolicyBranchMegaSectionsByZonalModeOrThrow(
    sections: TableSectionDto[],
    zonalMode: PolicyBranchMegaZonalMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] report has no sections.')
    }

    const tagged = sections.map(section => ({
        section,
        zonalMode: resolvePolicyBranchMegaZonalModeFromMetadataOrThrow(section)
    }))

    const filtered = tagged.filter(item => item.zonalMode === zonalMode).map(item => item.section)

    if (filtered.length === 0) {
        throw new Error(`[policy-branch-mega] no sections found for zonal=${zonalMode}.`)
    }

    return filtered
}
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
function resolveModePrefix(title: string | undefined): string {
    if (!title) return ''

    const normalized = normalizePolicyBranchMegaTitle(title).toUpperCase()
    if (normalized.includes('NO SL')) return 'NO SL · '
    if (normalized.includes('WITH SL')) return 'WITH SL · '

    return ''
}
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

function tryResolvePolicyBranchMegaBucketFromMetadataOrNull(section: TableSectionDto): PolicyBranchMegaBucketMode | null {
    const metadata = section.metadata
    if (!metadata) {
        return null
    }

    if (metadata.kind !== 'policy-branch-mega') {
        return null
    }

    if (!metadata.bucket) {
        throw new Error(`[policy-branch-mega] section metadata.bucket is missing. title=${section.title ?? 'n/a'}.`)
    }

    if (metadata.bucket === 'daily') return 'daily'
    if (metadata.bucket === 'intraday') return 'intraday'
    if (metadata.bucket === 'delayed') return 'delayed'
    if (metadata.bucket === 'total-aggregate') return 'total'

    throw new Error(`[policy-branch-mega] unsupported metadata.bucket value: ${String(metadata.bucket)}.`)
}

function tryResolvePolicyBranchMegaMetricFromMetadataOrNull(section: TableSectionDto): PolicyBranchMegaMetricMode | null {
    const metadata = section.metadata
    if (!metadata) {
        return null
    }

    if (metadata.kind !== 'policy-branch-mega') {
        return null
    }

    if (!metadata.metricVariant) {
        throw new Error(`[policy-branch-mega] section metadata.metricVariant is missing. title=${section.title ?? 'n/a'}.`)
    }

    if (metadata.metricVariant === 'real') return 'real'
    if (metadata.metricVariant === 'no-biggest-liq-loss') return 'no-biggest-liq-loss'

    throw new Error(`[policy-branch-mega] unsupported metadata.metricVariant value: ${String(metadata.metricVariant)}.`)
}

function resolvePolicyBranchMegaZonalModeFromMetadataOrThrow(section: TableSectionDto): PolicyBranchMegaZonalMode {
    const metadata = section.metadata
    if (!metadata || metadata.kind !== 'policy-branch-mega') {
        throw new Error(
            `[policy-branch-mega] section metadata is missing or kind is invalid for zonal filtering. title=${section.title ?? 'n/a'}.`
        )
    }

    if (!metadata.zonalMode) {
        throw new Error(`[policy-branch-mega] section metadata.zonalMode is missing. title=${section.title ?? 'n/a'}.`)
    }

    if (metadata.zonalMode === 'with-zonal') return 'with-zonal'
    if (metadata.zonalMode === 'without-zonal') return 'without-zonal'

    throw new Error(
        `[policy-branch-mega] unsupported metadata.zonalMode value for section ${section.title ?? 'n/a'}: ${String(metadata.zonalMode)}.`
    )
}
