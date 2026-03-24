import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type {
    CurrentPredictionBackfilledTrainingScopeStatsDto,
    CurrentPredictionHistoryItemDto,
    CurrentPredictionHistoryPageDto,
    CurrentPredictionIndexItemDto,
    CurrentPredictionLivePublicationInfoDto,
    CurrentPredictionLivePayloadDto,
    CurrentPredictionSet,
    CurrentPredictionTrainingScope
} from '../endpoints/reportEndpoints'
import { normalizeCurrentPredictionDateUtc } from '@/shared/utils/currentPredictionDate'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'

const { livePayload, datesIndex, historyPage } = API_ROUTES.currentPrediction
const CURRENT_PREDICTION_LIVE_CACHE_TTL_MS = 5 * 60 * 1000
const CURRENT_PREDICTION_INDEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CURRENT_PREDICTION_HISTORY_PAGE_CACHE_TTL_MS = 10 * 60 * 1000

export const DEFAULT_BACKFILLED_HISTORY_SCOPE: CurrentPredictionTrainingScope = 'full'
export type CurrentPredictionBackfilledTrainingScopeStats = CurrentPredictionBackfilledTrainingScopeStatsDto

export interface CurrentPredictionHistoryPageQueryArgs {
    set: CurrentPredictionSet
    scope: CurrentPredictionTrainingScope
    page: number
    pageSize: number
    days?: number
    fromDateUtc?: string
    toDateUtc?: string
}

function resolveCurrentPredictionIndexScope(
    set: CurrentPredictionSet,
    scope?: CurrentPredictionTrainingScope
): CurrentPredictionTrainingScope {
    if (!scope) {
        throw new Error(`[current-prediction] History index scope is required. set=${set}.`)
    }

    return scope
}

function readRequiredFiniteNumber(raw: unknown, fieldName: string): number {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        throw new Error(`[current-prediction] field '${fieldName}' must be a finite number.`)
    }

    return raw
}

function readRequiredBoolean(raw: unknown, fieldName: string): boolean {
    if (typeof raw !== 'boolean') {
        throw new Error(`[current-prediction] field '${fieldName}' must be a boolean.`)
    }

    return raw
}

function readRequiredString(raw: unknown, fieldName: string): string {
    if (typeof raw !== 'string' || !raw.trim()) {
        throw new Error(`[current-prediction] field '${fieldName}' must be a non-empty string.`)
    }

    return raw
}

function readRequiredDateString(raw: unknown, fieldName: string): string {
    return normalizeCurrentPredictionDateUtc(readRequiredString(raw, fieldName))
}

function mapCurrentPredictionIndexItem(raw: unknown, index: number): CurrentPredictionIndexItemDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] index item must be an object. index=${index}.`)
    }

    const item = raw as Record<string, unknown>
    return {
        id: readRequiredString(item.id, `index[${index}].id`),
        predictionDateUtc: readRequiredDateString(item.predictionDateUtc, `index[${index}].predictionDateUtc`)
    }
}

function mapCurrentPredictionTrainingScopeStats(
    raw: unknown
): CurrentPredictionBackfilledTrainingScopeStats | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] trainingScopeStats payload must be an object.')
    }

    const stats = raw as Record<string, unknown>

    return {
        fullStartDateUtc: readRequiredDateString(stats.fullStartDateUtc, 'trainingScopeStats.fullStartDateUtc'),
        fullEndDateUtc: readRequiredDateString(stats.fullEndDateUtc, 'trainingScopeStats.fullEndDateUtc'),
        fullDays: readRequiredFiniteNumber(stats.fullDays, 'trainingScopeStats.fullDays'),
        trainStartDateUtc: readRequiredDateString(stats.trainStartDateUtc, 'trainingScopeStats.trainStartDateUtc'),
        trainEndDateUtc: readRequiredDateString(stats.trainEndDateUtc, 'trainingScopeStats.trainEndDateUtc'),
        trainDays: readRequiredFiniteNumber(stats.trainDays, 'trainingScopeStats.trainDays'),
        oosStartDateUtc: readRequiredDateString(stats.oosStartDateUtc, 'trainingScopeStats.oosStartDateUtc'),
        oosEndDateUtc: readRequiredDateString(stats.oosEndDateUtc, 'trainingScopeStats.oosEndDateUtc'),
        oosDays: readRequiredFiniteNumber(stats.oosDays, 'trainingScopeStats.oosDays'),
        recentStartDateUtc: readRequiredDateString(stats.recentStartDateUtc, 'trainingScopeStats.recentStartDateUtc'),
        recentEndDateUtc: readRequiredDateString(stats.recentEndDateUtc, 'trainingScopeStats.recentEndDateUtc'),
        recentDays: readRequiredFiniteNumber(stats.recentDays, 'trainingScopeStats.recentDays'),
        recentTailRowsLimit: readRequiredFiniteNumber(
            stats.recentTailRowsLimit,
            'trainingScopeStats.recentTailRowsLimit'
        ),
        recentMatchesOos: readRequiredBoolean(stats.recentMatchesOos, 'trainingScopeStats.recentMatchesOos'),
        totalDays: readRequiredFiniteNumber(stats.totalDays, 'trainingScopeStats.totalDays'),
        trainShare: readRequiredFiniteNumber(stats.trainShare, 'trainingScopeStats.trainShare'),
        oosShare: readRequiredFiniteNumber(stats.oosShare, 'trainingScopeStats.oosShare'),
        lastTrainDateUtc: readRequiredDateString(stats.lastTrainDateUtc, 'trainingScopeStats.lastTrainDateUtc'),
        firstOosDateUtc: readRequiredDateString(stats.firstOosDateUtc, 'trainingScopeStats.firstOosDateUtc')
    }
}

function mapCurrentPredictionLivePublicationInfo(raw: unknown): CurrentPredictionLivePublicationInfoDto | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] publication payload must be an object.')
    }

    const publication = raw as Record<string, unknown>

    return {
        targetPredictionDateUtc: readRequiredDateString(
            publication.targetPredictionDateUtc,
            'publication.targetPredictionDateUtc'
        ),
        publishedPredictionDateUtc: readRequiredDateString(
            publication.publishedPredictionDateUtc,
            'publication.publishedPredictionDateUtc'
        ),
        isTargetPredictionDatePublished: readRequiredBoolean(
            publication.isTargetPredictionDatePublished,
            'publication.isTargetPredictionDatePublished'
        ),
        expectedPreview: readRequiredBoolean(publication.expectedPreview, 'publication.expectedPreview')
    }
}

function mapCurrentPredictionHistoryItem(raw: unknown, index: number): CurrentPredictionHistoryItemDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] history item must be an object. index=${index}.`)
    }

    const item = raw as Record<string, unknown>
    if (!item.report || typeof item.report !== 'object') {
        throw new Error(`[current-prediction] history item report is invalid. index=${index}.`)
    }

    return {
        id: readRequiredString(item.id, `history.items[${index}].id`),
        predictionDateUtc: readRequiredDateString(item.predictionDateUtc, `history.items[${index}].predictionDateUtc`),
        report: mapReportResponse(item.report)
    }
}

function mapCurrentPredictionHistoryPageResponse(raw: unknown): CurrentPredictionHistoryPageDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] history page payload must be an object.')
    }

    const payload = raw as Record<string, unknown>
    if (!Array.isArray(payload.items)) {
        throw new Error('[current-prediction] history page items payload must be an array.')
    }

    return {
        page: readRequiredFiniteNumber(payload.page, 'historyPage.page'),
        pageSize: readRequiredFiniteNumber(payload.pageSize, 'historyPage.pageSize'),
        totalPages: readRequiredFiniteNumber(payload.totalPages, 'historyPage.totalPages'),
        totalBuiltReports: readRequiredFiniteNumber(payload.totalBuiltReports, 'historyPage.totalBuiltReports'),
        filteredReports: readRequiredFiniteNumber(payload.filteredReports, 'historyPage.filteredReports'),
        hasPrevPage: readRequiredBoolean(payload.hasPrevPage, 'historyPage.hasPrevPage'),
        hasNextPage: readRequiredBoolean(payload.hasNextPage, 'historyPage.hasNextPage'),
        earliestBuiltPredictionDateUtc: readRequiredDateString(
            payload.earliestBuiltPredictionDateUtc,
            'historyPage.earliestBuiltPredictionDateUtc'
        ),
        latestBuiltPredictionDateUtc: readRequiredDateString(
            payload.latestBuiltPredictionDateUtc,
            'historyPage.latestBuiltPredictionDateUtc'
        ),
        missingBuiltWeekdays: readRequiredFiniteNumber(payload.missingBuiltWeekdays, 'historyPage.missingBuiltWeekdays'),
        expectedBuiltWeekdays: readRequiredFiniteNumber(
            payload.expectedBuiltWeekdays,
            'historyPage.expectedBuiltWeekdays'
        ),
        missingBuiltFromDateUtc: readRequiredDateString(
            payload.missingBuiltFromDateUtc,
            'historyPage.missingBuiltFromDateUtc'
        ),
        missingBuiltToDateUtc: readRequiredDateString(
            payload.missingBuiltToDateUtc,
            'historyPage.missingBuiltToDateUtc'
        ),
        items: payload.items.map((item, index) => mapCurrentPredictionHistoryItem(item, index)),
        trainingScopeStats: mapCurrentPredictionTrainingScopeStats(payload.trainingScopeStats)
    }
}

function mapCurrentPredictionLivePayloadResponse(raw: unknown): CurrentPredictionLivePayloadDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[current-prediction] live payload must be an object.')
    }

    const payload = raw as Record<string, unknown>
    if (!payload.report || typeof payload.report !== 'object') {
        throw new Error('[current-prediction] live payload report is invalid.')
    }

    return {
        report: mapReportResponse(payload.report),
        // Поле publication читается мягко, чтобы rolling deploy не ломал страницу,
        // если frontend уже обновлён, а backend ещё отдаёт старый payload без metadata.
        publication: mapCurrentPredictionLivePublicationInfo(payload.publication),
        trainingScopeStats: mapCurrentPredictionTrainingScopeStats(payload.trainingScopeStats)
    }
}

export async function fetchCurrentPredictionLivePayload(
    scope?: CurrentPredictionTrainingScope
): Promise<CurrentPredictionLivePayloadDto> {
    const search = new URLSearchParams()
    if (scope) {
        search.set('scope', scope)
    }

    const querySuffix = search.toString()
    const url = `${API_BASE_URL}${livePayload.path}${querySuffix ? `?${querySuffix}` : ''}`
    const resp = await fetch(url)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load current live prediction payload: ${resp.status} ${text}`)
    }

    return mapCurrentPredictionLivePayloadResponse(await resp.json())
}

async function fetchCurrentPredictionIndex(
    set: CurrentPredictionSet,
    days?: number,
    scope?: CurrentPredictionTrainingScope
): Promise<CurrentPredictionIndexItemDto[]> {
    const resolvedScope = resolveCurrentPredictionIndexScope(set, scope)
    const search = new URLSearchParams()

    search.set('set', set)
    search.set('scope', resolvedScope)

    if (typeof days === 'number' && Number.isFinite(days) && days > 0) {
        search.set('days', String(days))
    }

    const querySuffix = search.toString()
    const url = `${API_BASE_URL}${datesIndex.path}${querySuffix ? `?${querySuffix}` : ''}`
    const resp = await fetch(url)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load current prediction index: ${resp.status} ${text}`)
    }

    const payload = await resp.json()
    if (!Array.isArray(payload)) {
        throw new Error('[current-prediction] index payload must be an array.')
    }

    return payload.map((item, index) => mapCurrentPredictionIndexItem(item, index))
}

export async function fetchCurrentPredictionHistoryPage(
    args: CurrentPredictionHistoryPageQueryArgs
): Promise<CurrentPredictionHistoryPageDto> {
    const resolvedScope = resolveCurrentPredictionIndexScope(args.set, args.scope)
    if (!Number.isInteger(args.page) || args.page <= 0) {
        throw new Error(`[current-prediction] history page must be a positive integer. page=${args.page}.`)
    }
    if (!Number.isInteger(args.pageSize) || args.pageSize <= 0) {
        throw new Error(`[current-prediction] history pageSize must be a positive integer. pageSize=${args.pageSize}.`)
    }

    const search = new URLSearchParams()
    search.set('set', args.set)
    search.set('scope', resolvedScope)
    search.set('page', String(args.page))
    search.set('pageSize', String(args.pageSize))

    if (typeof args.days === 'number' && Number.isFinite(args.days) && args.days > 0) {
        search.set('days', String(args.days))
    }
    if (args.fromDateUtc) {
        search.set('fromDateUtc', normalizeCurrentPredictionDateUtc(args.fromDateUtc))
    }
    if (args.toDateUtc) {
        search.set('toDateUtc', normalizeCurrentPredictionDateUtc(args.toDateUtc))
    }

    const url = `${API_BASE_URL}${historyPage.path}?${search.toString()}`
    const resp = await fetch(url)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load current prediction history page: ${resp.status} ${text}`)
    }

    return mapCurrentPredictionHistoryPageResponse(await resp.json())
}

export function useCurrentPredictionLivePayloadQuery(
    scope?: CurrentPredictionTrainingScope
): UseQueryResult<CurrentPredictionLivePayloadDto, Error> {
    return useQuery({
        queryKey: ['current-prediction', 'live-payload', scope ?? 'default'] as const,
        queryFn: () => fetchCurrentPredictionLivePayload(scope),
        retry: false,
        staleTime: CURRENT_PREDICTION_LIVE_CACHE_TTL_MS,
        gcTime: CURRENT_PREDICTION_LIVE_CACHE_TTL_MS,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })
}

export function useCurrentPredictionIndexQuery(
    set: CurrentPredictionSet = 'backfilled',
    days?: number,
    scope?: CurrentPredictionTrainingScope
): UseQueryResult<CurrentPredictionIndexItemDto[], Error> {
    const resolvedScope = resolveCurrentPredictionIndexScope(set, scope)

    return useQuery({
        queryKey: ['current-prediction', 'dates', set, resolvedScope, days ?? 'all'] as const,
        queryFn: () => fetchCurrentPredictionIndex(set, days, resolvedScope),
        retry: false,
        staleTime: CURRENT_PREDICTION_INDEX_CACHE_TTL_MS,
        gcTime: CURRENT_PREDICTION_INDEX_CACHE_TTL_MS,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })
}

export function useCurrentPredictionHistoryPageQuery(
    args: CurrentPredictionHistoryPageQueryArgs
): UseQueryResult<CurrentPredictionHistoryPageDto, Error> {
    const resolvedScope = resolveCurrentPredictionIndexScope(args.set, args.scope)

    return useQuery({
        queryKey: [
            'current-prediction',
            'history-page',
            args.set,
            resolvedScope,
            args.days ?? 'all',
            args.fromDateUtc ?? 'from-all',
            args.toDateUtc ?? 'to-all',
            args.page,
            args.pageSize
        ] as const,
        queryFn: () => fetchCurrentPredictionHistoryPage({ ...args, scope: resolvedScope }),
        retry: false,
        staleTime: CURRENT_PREDICTION_HISTORY_PAGE_CACHE_TTL_MS,
        gcTime: CURRENT_PREDICTION_HISTORY_PAGE_CACHE_TTL_MS,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })
}
