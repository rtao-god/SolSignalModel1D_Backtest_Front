import type {
    GlobalMeta,
    ModelStatsFamilyFilter,
    ResolvedSegmentMeta,
    SegmentInfo,
    SegmentKey,
    ReportSection,
    KeyValueSection,
    TableSection
} from './modelStatsTypes'
import type { TFunction } from 'i18next'
import type { CurrentPredictionBackfilledTrainingScopeStats } from '@/shared/api/tanstackQueries/currentPrediction'
import { SEGMENT_INIT_ORDER, SEGMENT_PREFIX } from './modelStatsConstants'

const MODEL_STATS_OVERVIEW_SECTION_KEY = 'models_overview'
const MODEL_STATS_OVERVIEW_FAMILY_COLUMN_KEY = 'family'
const DAILY_MODEL_SECTION_KEY_MARKERS = ['daily_label_summary', 'daily_label_confusion', 'trend_direction_confusion']
const SL_MODEL_SECTION_KEY_MARKERS = ['sl_model_', 'sl_threshold_sweep']
const DAILY_MODEL_SECTION_TITLE_MARKERS = [/^Daily label summary/i, /^Daily label confusion/i, /^Trend-direction confusion/i]
const SL_MODEL_SECTION_TITLE_MARKERS = [/^SL-model/i, /^SL threshold sweep/i]

function formatSegmentDayCount(value: number, locale: string): string {
    const formatted = new Intl.NumberFormat(locale.toLowerCase().startsWith('ru') ? 'ru-RU' : 'en-US').format(value)

    if (!locale.toLowerCase().startsWith('ru')) {
        return `${formatted} days`
    }

    const absValue = Math.abs(value) % 100
    const lastDigit = absValue % 10

    if (absValue >= 11 && absValue <= 19) {
        return `${formatted} дней`
    }

    if (lastDigit === 1) {
        return `${formatted} день`
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return `${formatted} дня`
    }

    return `${formatted} дней`
}

export function buildModelStatsHeaderSubtitle(
    locale: string,
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
): string {
    const isRu = locale.toLowerCase().startsWith('ru')
    const oosPercent = splitStats?.oosHistoryDaySharePercent ?? 30
    const recentPercent = splitStats?.recentHistoryDaySharePercent ?? 15
    const trainPercent = 100 - oosPercent

    const fullDaysNote = splitStats ? ` (${formatSegmentDayCount(splitStats.fullDays, locale)})` : ''
    const trainDaysNote = splitStats ? ` (${formatSegmentDayCount(splitStats.trainDays, locale)})` : ''
    const oosDaysNote = splitStats ? ` (${formatSegmentDayCount(splitStats.oosDays, locale)})` : ''
    const recentDaysNote = splitStats ? ` (${formatSegmentDayCount(splitStats.recentDays, locale)})` : ''

    return isRu ?
            `Сводный отчёт по качеству и поведению ML-моделей на четырёх исторических срезах: Full = 100% завершённой истории${fullDaysNote}, Train = более ранние ${trainPercent}% перед базовым OOS ${oosPercent}%${trainDaysNote}, OOS = последние ${oosPercent}% полной истории${oosDaysNote}, Recent = последние ${recentPercent}% полной истории внутри OOS ${oosPercent}%${recentDaysNote}.`
        :   `Summary of ML model quality and behavior across four history slices: Full = 100% of completed history${fullDaysNote}, Train = the earlier ${trainPercent}% before the base OOS ${oosPercent}%${trainDaysNote}, OOS = the latest ${oosPercent}% of full history${oosDaysNote}, Recent = the latest ${recentPercent}% of full history inside OOS ${oosPercent}%${recentDaysNote}.`
}

export function stripSegmentPrefix(title: string | undefined | null): string {
    if (!title) return ''
    const match = title.match(/^\[(FULL|TRAIN|OOS|RECENT)\]\s*/i)
    if (!match) return title
    return title.slice(match[0].length)
}

export function isKeyValueSection(section: ReportSection): section is KeyValueSection {
    return Array.isArray((section as KeyValueSection).items)
}

export function isTableSection(section: ReportSection): section is TableSection {
    return Array.isArray((section as TableSection).columns)
}

function cloneTableSectionWithRows(section: TableSection, rows: string[][]): TableSection {
    return {
        ...section,
        rows: rows.map(row => [...row])
    }
}

function resolveOverviewFamilyColumnIndex(section: TableSection): number {
    const columnKeyIndex = section.columnKeys?.findIndex(key => key === MODEL_STATS_OVERVIEW_FAMILY_COLUMN_KEY) ?? -1
    if (columnKeyIndex >= 0) {
        return columnKeyIndex
    }

    const columnTitleIndex = section.columns?.findIndex(column => column.trim().toLowerCase() === 'family') ?? -1
    if (columnTitleIndex >= 0) {
        return columnTitleIndex
    }

    throw new Error('[model-stats] models overview table is missing the family column.')
}

function matchesSectionKeyMarkers(sectionKey: string | undefined, markers: readonly string[]): boolean {
    const normalizedKey = sectionKey?.trim().toLowerCase() ?? ''
    if (!normalizedKey) {
        return false
    }

    return markers.some(marker => normalizedKey.includes(marker))
}

function matchesSectionTitleMarkers(title: string | undefined, markers: readonly RegExp[]): boolean {
    const normalizedTitle = stripSegmentPrefix(title).trim()
    if (!normalizedTitle) {
        return false
    }

    return markers.some(marker => marker.test(normalizedTitle))
}

function matchesFamilySpecificSection(section: TableSection, familyFilter: ModelStatsFamilyFilter): boolean {
    if (section.sectionKey === MODEL_STATS_OVERVIEW_SECTION_KEY) {
        return true
    }

    if (familyFilter === 'daily_model') {
        return (
            matchesSectionKeyMarkers(section.sectionKey, DAILY_MODEL_SECTION_KEY_MARKERS) ||
            matchesSectionTitleMarkers(section.title, DAILY_MODEL_SECTION_TITLE_MARKERS)
        )
    }

    return (
        matchesSectionKeyMarkers(section.sectionKey, SL_MODEL_SECTION_KEY_MARKERS) ||
        matchesSectionTitleMarkers(section.title, SL_MODEL_SECTION_TITLE_MARKERS)
    )
}

// Один published report обслуживает и общую страницу model stats, и обе PFI-страницы.
// Family-filter применяется здесь, чтобы страницы брали один каноничный источник,
// а не расходились по разным endpoint'ам и payload-контрактам.
export function filterModelStatsTableSectionsByFamily(
    sections: TableSection[],
    familyFilter: ModelStatsFamilyFilter | null | undefined
): TableSection[] {
    if (!familyFilter) {
        return sections
    }

    const filteredSections: TableSection[] = []

    for (const section of sections) {
        if (section.sectionKey === MODEL_STATS_OVERVIEW_SECTION_KEY) {
            const familyColumnIndex = resolveOverviewFamilyColumnIndex(section)
            const filteredRows = (section.rows ?? []).filter(row => row[familyColumnIndex]?.trim() === familyFilter)

            if (filteredRows.length > 0) {
                filteredSections.push(cloneTableSectionWithRows(section, filteredRows))
            }

            continue
        }

        if (matchesFamilySpecificSection(section, familyFilter)) {
            filteredSections.push(section)
        }
    }

    if (filteredSections.length > 0) {
        return filteredSections
    }

    const availableSectionKeys = sections
        .map(section => section.sectionKey?.trim())
        .filter((value): value is string => Boolean(value))
        .join(', ')
    throw new Error(
        `[model-stats] family filter '${familyFilter}' matched no table sections. availableSectionKeys=[${availableSectionKeys || '<none>'}].`
    )
}

export function buildGlobalMeta(sections: ReportSection[]): GlobalMeta | null {
    if (!sections.length) {
        return null
    }

    const metaSection = sections.filter(isKeyValueSection).find(section => {
        const title = section.title ?? ''
        return title.includes('multi-segment') || title.includes('Model statistics parameters')
    })

    if (!metaSection || !Array.isArray(metaSection.items)) {
        return null
    }

    const map = new Map<string, string>()
    for (const item of metaSection.items) {
        if (!item) continue
        if (typeof item.key === 'string') {
            map.set(item.key, String(item.value ?? ''))
        }
    }

    const parseIntStrict = (key: string): number => {
        const raw = map.get(key)
        const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
        if (Number.isFinite(parsed)) {
            return parsed
        }

        throw new Error(`[model-stats] invalid global meta integer: ${key}='${raw ?? '<missing>'}'.`)
    }

    const parseBoolSafe = (key: string): boolean => {
        const raw = (map.get(key) ?? '').toLowerCase()
        return raw === 'true' || raw === '1' || raw === 'yes'
    }

    return {
        runKind: map.get('RunKind') ?? '',
        hasOos: parseBoolSafe('HasOos'),
        trainRecordsCount: parseIntStrict('TrainRecordsCount'),
        oosRecordsCount: parseIntStrict('OosRecordsCount'),
        totalRecordsCount: parseIntStrict('TotalRecordsCount'),
        recentDays: parseIntStrict('RecentDays'),
        recentRecordsCount: parseIntStrict('RecentRecordsCount')
    }
}

export function collectAvailableSegments(sections: TableSection[]): SegmentInfo[] {
    if (!sections.length) {
        return []
    }

    const found = new Map<SegmentKey, SegmentInfo>()

    for (const section of sections) {
        const title = section.title ?? ''
        ;(Object.entries(SEGMENT_PREFIX) as [SegmentKey, string][]).forEach(([key, prefix]) => {
            if (title.startsWith(prefix) && !found.has(key)) {
                found.set(key, { key, prefix })
            }
        })
    }

    const ordered: SegmentInfo[] = []
    for (const key of SEGMENT_INIT_ORDER) {
        const seg = found.get(key)
        if (seg) {
            ordered.push(seg)
        }
    }

    return ordered
}

export function resolveSegmentMeta(
    segment: SegmentKey,
    meta: GlobalMeta | null,
    t: TFunction,
    locale: string,
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
): ResolvedSegmentMeta | null {
    if (!meta) {
        return null
    }

    switch (segment) {
        case 'OOS': {
            const label = t('reports:modelStats.inner.segmentMeta.oos.label')
            const description =
                locale.toLowerCase().startsWith('ru') ?
                    `${label}: записей ${meta.oosRecordsCount}. Это базовый пользовательский хвост новых дней: 30% полной истории.${splitStats ? ` Сейчас это ${formatSegmentDayCount(splitStats.oosDays, locale)}.` : ''}`
                :   `${label}: ${meta.oosRecordsCount} records. This is the base user tail of new days: 30% of full history.${splitStats ? ` This currently contains ${formatSegmentDayCount(splitStats.oosDays, locale)}.` : ''}`
            return { label, description }
        }
        case 'TRAIN': {
            const label = t('reports:modelStats.inner.segmentMeta.train.label')
            const description =
                locale.toLowerCase().startsWith('ru') ?
                    `${label}: записей ${meta.trainRecordsCount}. Это более ранние 70% полной истории перед базовым OOS 30%.${splitStats ? ` Сейчас это ${formatSegmentDayCount(splitStats.trainDays, locale)}.` : ''}`
                :   `${label}: ${meta.trainRecordsCount} records. This is the earlier 70% of full history before the base OOS 30%.${splitStats ? ` This currently contains ${formatSegmentDayCount(splitStats.trainDays, locale)}.` : ''}`
            return { label, description }
        }
        case 'FULL': {
            const label = t('reports:modelStats.inner.segmentMeta.full.label')
            const description =
                locale.toLowerCase().startsWith('ru') ?
                    `${label}: записей ${meta.totalRecordsCount}. Это 100% завершённой истории.${splitStats ? ` Сейчас это ${formatSegmentDayCount(splitStats.fullDays, locale)}.` : ''}`
                :   `${label}: ${meta.totalRecordsCount} records. This is 100% of completed history.${splitStats ? ` This currently contains ${formatSegmentDayCount(splitStats.fullDays, locale)}.` : ''}`
            return { label, description }
        }
        case 'RECENT': {
            const label = t('reports:modelStats.inner.segmentMeta.recent.label', {
                days: meta.recentDays
            })
            const description =
                locale.toLowerCase().startsWith('ru') ?
                    `${label}: записей ${meta.recentRecordsCount}. Это короткий пользовательский хвост: последние 15% полной истории внутри OOS 30%.${splitStats ? ` Сейчас это ${formatSegmentDayCount(splitStats.recentDays, locale)}.` : ''}`
                :   `${label}: ${meta.recentRecordsCount} records. This is the short user tail: the latest 15% of full history inside OOS 30%.${splitStats ? ` This currently contains ${formatSegmentDayCount(splitStats.recentDays, locale)}.` : ''}`
            return { label, description }
        }
        default:
            return null
    }
}
