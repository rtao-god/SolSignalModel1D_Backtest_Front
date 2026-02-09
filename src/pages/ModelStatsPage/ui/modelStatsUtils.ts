import type {
    GlobalMeta,
    ResolvedSegmentMeta,
    SegmentInfo,
    SegmentKey,
    ReportSection,
    KeyValueSection,
    TableSection
} from './modelStatsTypes'
import { SEGMENT_INIT_ORDER, SEGMENT_PREFIX } from './modelStatsConstants'

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

export function buildGlobalMeta(sections: ReportSection[]): GlobalMeta | null {
    if (!sections.length) {
        return null
    }

    const metaSection = sections.filter(isKeyValueSection).find(section => {
        const title = section.title ?? ''
        return title.includes('multi-segment') || title.includes('Параметры модельных статистик')
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

    const parseIntSafe = (key: string): number => {
        const raw = map.get(key)
        const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
        return Number.isFinite(parsed) ? parsed : 0
    }

    const parseBoolSafe = (key: string): boolean => {
        const raw = (map.get(key) ?? '').toLowerCase()
        return raw === 'true' || raw === '1' || raw === 'yes'
    }

    return {
        runKind: map.get('RunKind') ?? '',
        hasOos: parseBoolSafe('HasOos'),
        trainRecordsCount: parseIntSafe('TrainRecordsCount'),
        oosRecordsCount: parseIntSafe('OosRecordsCount'),
        totalRecordsCount: parseIntSafe('TotalRecordsCount'),
        recentDays: parseIntSafe('RecentDays'),
        recentRecordsCount: parseIntSafe('RecentRecordsCount')
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

export function resolveSegmentMeta(segment: SegmentKey, meta: GlobalMeta | null): ResolvedSegmentMeta | null {
    if (!meta) {
        return null
    }

    switch (segment) {
        case 'OOS': {
            const label = 'OOS (честная проверка)'
            const description = `${label}: записей ${meta.oosRecordsCount}. Используется для оценки качества на данных, которых модель не видела при обучении.`
            return { label, description }
        }
        case 'TRAIN': {
            const label = 'Train (обучение)'
            const description = `${label}: записей ${meta.trainRecordsCount}. Показывает поведение модели на обучающей выборке.`
            return { label, description }
        }
        case 'FULL': {
            const label = 'Full history'
            const description = `${label}: записей ${meta.totalRecordsCount}. Вся доступная история данных.`
            return { label, description }
        }
        case 'RECENT': {
            const label = `Recent (${meta.recentDays} d)`
            const description = `${label}: записей ${meta.recentRecordsCount}. Свежий отрезок данных за последние дни.`
            return { label, description }
        }
        default:
            return null
    }
}
