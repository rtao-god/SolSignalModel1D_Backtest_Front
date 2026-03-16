import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import type {
    CurrentPredictionHistoryPageDto,
    CurrentPredictionHistoryPageItemDto,
    CurrentPredictionIndexItemDto,
    CurrentPredictionSet,
    CurrentPredictionTrainingScope
} from '../endpoints/reportEndpoints'
import { normalizeCurrentPredictionDateUtc } from '@/shared/utils/currentPredictionDate'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'

const { latestReport, datesIndex, historyPage } = API_ROUTES.currentPrediction
const CURRENT_PREDICTION_INDEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CURRENT_PREDICTION_HISTORY_PAGE_CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_CURRENT_PREDICTION_LIVE_SCOPE: CurrentPredictionTrainingScope = 'full'
const DEFAULT_CURRENT_PREDICTION_SET: CurrentPredictionSet = 'live'
const DEFAULT_HISTORY_PREDICTION_SET: CurrentPredictionSet = 'backfilled'
export const DEFAULT_BACKFILLED_HISTORY_SCOPE: CurrentPredictionTrainingScope = 'full'
export const DEFAULT_CURRENT_PREDICTION_HISTORY_PAGE = 1
export const DEFAULT_CURRENT_PREDICTION_HISTORY_PAGE_SIZE = 10

export interface CurrentPredictionBackfilledSplitStats {
    trainDays: number
    oosDays: number
    totalDays: number
    trainShare: number
    oosShare: number
    lastTrainDateUtc: string
    firstOosDateUtc: string
}

interface CurrentPredictionBackfilledSplitStatsState {
    data: CurrentPredictionBackfilledSplitStats | null
    isLoading: boolean
    error: Error | null
}

interface CurrentPredictionLatestResponse {
    live?: unknown
    backfilled?: unknown
}

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

async function fetchCurrentPrediction(
    set: CurrentPredictionSet,
    scope?: CurrentPredictionTrainingScope
): Promise<ReportDocumentDto> {
    const search = new URLSearchParams()
    if (set === 'live' && scope) {
        search.set('scope', scope)
    }

    const querySuffix = search.toString()
    const url = `${API_BASE_URL}${latestReport.path}${querySuffix ? `?${querySuffix}` : ''}`

    const resp = await fetch(url, { cache: 'no-store' })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load current prediction report: ${resp.status} ${text}`)
    }

    const raw = (await resp.json()) as CurrentPredictionLatestResponse
    const report = set === 'live' ? raw.live : raw.backfilled

    if (!report) {
        const scopeLabel = scope ?? 'train'
        throw new Error(`Current prediction report "${set}" is missing in response (scope=${scopeLabel}).`)
    }

    return mapReportResponse(report)
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

    const payload = (await resp.json()) as Array<{ id?: unknown; predictionDateUtc?: unknown }>
    if (!Array.isArray(payload)) {
        throw new Error('[current-prediction] index payload must be an array.')
    }

    return payload.map((item, index) => {
        if (typeof item?.id !== 'string' || !item.id.trim()) {
            throw new Error(`[current-prediction] index item id is invalid at index=${index}.`)
        }
        if (typeof item?.predictionDateUtc !== 'string') {
            throw new Error(`[current-prediction] index item predictionDateUtc is invalid at index=${index}.`)
        }

        return {
            id: item.id,
            predictionDateUtc: normalizeCurrentPredictionDateUtc(item.predictionDateUtc)
        }
    })
}

async function fetchCurrentPredictionHistoryPage(
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

    const querySuffix = search.toString()
    const url = `${API_BASE_URL}${historyPage.path}?${querySuffix}`
    const resp = await fetch(url)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load current prediction history page: ${resp.status} ${text}`)
    }

    const payload = (await resp.json()) as Record<string, unknown>
    return mapCurrentPredictionHistoryPageResponse(payload)
}

function mapCurrentPredictionHistoryPageResponse(raw: Record<string, unknown>): CurrentPredictionHistoryPageDto {
    const page = readRequiredFiniteNumber(raw.page, 'page')
    const pageSize = readRequiredFiniteNumber(raw.pageSize, 'pageSize')
    const totalPages = readRequiredFiniteNumber(raw.totalPages, 'totalPages')
    const totalBuiltReports = readRequiredFiniteNumber(raw.totalBuiltReports, 'totalBuiltReports')
    const filteredReports = readRequiredFiniteNumber(raw.filteredReports, 'filteredReports')
    const hasPrevPage = readRequiredBoolean(raw.hasPrevPage, 'hasPrevPage')
    const hasNextPage = readRequiredBoolean(raw.hasNextPage, 'hasNextPage')
    const earliestBuiltPredictionDateUtc = readRequiredDateString(raw.earliestBuiltPredictionDateUtc, 'earliestBuiltPredictionDateUtc')
    const latestBuiltPredictionDateUtc = readRequiredDateString(raw.latestBuiltPredictionDateUtc, 'latestBuiltPredictionDateUtc')
    const missingBuiltWeekdays = readRequiredFiniteNumber(raw.missingBuiltWeekdays, 'missingBuiltWeekdays')
    const expectedBuiltWeekdays = readRequiredFiniteNumber(raw.expectedBuiltWeekdays, 'expectedBuiltWeekdays')
    const missingBuiltFromDateUtc = readRequiredDateString(raw.missingBuiltFromDateUtc, 'missingBuiltFromDateUtc')
    const missingBuiltToDateUtc = readRequiredDateString(raw.missingBuiltToDateUtc, 'missingBuiltToDateUtc')
    const itemsRaw = raw.items
    if (!Array.isArray(itemsRaw)) {
        throw new Error('[current-prediction] history page items payload must be an array.')
    }

    const items = itemsRaw.map((item, index) => mapCurrentPredictionHistoryPageItem(item, index))

    return {
        page,
        pageSize,
        totalPages,
        totalBuiltReports,
        filteredReports,
        hasPrevPage,
        hasNextPage,
        earliestBuiltPredictionDateUtc,
        latestBuiltPredictionDateUtc,
        missingBuiltWeekdays,
        expectedBuiltWeekdays,
        missingBuiltFromDateUtc,
        missingBuiltToDateUtc,
        items
    }
}

function mapCurrentPredictionHistoryPageItem(raw: unknown, index: number): CurrentPredictionHistoryPageItemDto {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[current-prediction] history page item must be an object. index=${index}.`)
    }

    const item = raw as Record<string, unknown>
    const id = item.id
    const predictionDateUtc = item.predictionDateUtc
    const report = item.report

    if (typeof id !== 'string' || !id.trim()) {
        throw new Error(`[current-prediction] history page item id is invalid at index=${index}.`)
    }
    if (typeof predictionDateUtc !== 'string') {
        throw new Error(`[current-prediction] history page item predictionDateUtc is invalid at index=${index}.`)
    }
    if (!report || typeof report !== 'object') {
        throw new Error(`[current-prediction] history page item report is invalid at index=${index}.`)
    }

    return {
        id,
        predictionDateUtc: normalizeCurrentPredictionDateUtc(predictionDateUtc),
        report: mapReportResponse(report)
    }
}

function readRequiredFiniteNumber(raw: unknown, fieldName: string): number {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        throw new Error(`[current-prediction] history page field '${fieldName}' must be a finite number.`)
    }

    return raw
}

function readRequiredBoolean(raw: unknown, fieldName: string): boolean {
    if (typeof raw !== 'boolean') {
        throw new Error(`[current-prediction] history page field '${fieldName}' must be a boolean.`)
    }

    return raw
}

function readRequiredDateString(raw: unknown, fieldName: string): string {
    if (typeof raw !== 'string') {
        throw new Error(`[current-prediction] history page field '${fieldName}' must be a date string.`)
    }

    return normalizeCurrentPredictionDateUtc(raw)
}

function collectUniquePredictionDates(index: CurrentPredictionIndexItemDto[] | undefined): string[] {
    if (!index || index.length === 0) {
        return []
    }

    return Array.from(new Set(index.map(item => item.predictionDateUtc))).sort((left, right) =>
        left < right ? -1
        : left > right ? 1
        : 0
    )
}

function buildBackfilledSplitStats(
    trainIndex: CurrentPredictionIndexItemDto[],
    oosIndex: CurrentPredictionIndexItemDto[]
): CurrentPredictionBackfilledSplitStats {
    const trainDates = collectUniquePredictionDates(trainIndex)
    const oosDates = collectUniquePredictionDates(oosIndex)

    if (trainDates.length === 0) {
        throw new Error('[current-prediction] backfilled train split index is empty.')
    }
    if (oosDates.length === 0) {
        throw new Error('[current-prediction] backfilled oos split index is empty.')
    }

    const overlap = trainDates.filter(date => oosDates.includes(date))
    if (overlap.length > 0) {
        throw new Error(
            `[current-prediction] backfilled train/oos split index overlaps by prediction date. overlap=${overlap.slice(0, 5).join(', ')}.`
        )
    }

    const lastTrainDateUtc = trainDates[trainDates.length - 1]
    const firstOosDateUtc = oosDates[0]

    if (lastTrainDateUtc >= firstOosDateUtc) {
        throw new Error(
            `[current-prediction] backfilled split boundary is invalid. lastTrainDateUtc=${lastTrainDateUtc}, firstOosDateUtc=${firstOosDateUtc}.`
        )
    }

    const trainDays = trainDates.length
    const oosDays = oosDates.length
    const totalDays = trainDays + oosDays

    return {
        trainDays,
        oosDays,
        totalDays,
        trainShare: trainDays / totalDays,
        oosShare: oosDays / totalDays,
        lastTrainDateUtc,
        firstOosDateUtc
    }
}
export function useCurrentPredictionReportQuery(
    set: CurrentPredictionSet = 'live',
    scope?: CurrentPredictionTrainingScope
): UseQueryResult<ReportDocumentDto, Error> {
    const queryOptions = buildCurrentPredictionReportQueryOptions(set, scope)
    return useQuery(queryOptions)
}

export function useCurrentPredictionIndexQuery(
    set: CurrentPredictionSet = 'backfilled',
    days?: number,
    scope?: CurrentPredictionTrainingScope
): UseQueryResult<CurrentPredictionIndexItemDto[], Error> {
    const queryOptions = buildCurrentPredictionIndexQueryOptions(set, days, scope)
    return useQuery(queryOptions)
}

export function useCurrentPredictionHistoryPageQuery(
    args: CurrentPredictionHistoryPageQueryArgs
): UseQueryResult<CurrentPredictionHistoryPageDto, Error> {
    const queryOptions = buildCurrentPredictionHistoryPageQueryOptions(args)
    return useQuery(queryOptions)
}

export function useCurrentPredictionBackfilledSplitStats(): CurrentPredictionBackfilledSplitStatsState {
    const trainIndexQuery = useCurrentPredictionIndexQuery(DEFAULT_HISTORY_PREDICTION_SET, undefined, 'train')
    const oosIndexQuery = useCurrentPredictionIndexQuery(DEFAULT_HISTORY_PREDICTION_SET, undefined, 'oos')

    if (trainIndexQuery.error) {
        return {
            data: null,
            isLoading: false,
            error: trainIndexQuery.error
        }
    }

    if (oosIndexQuery.error) {
        return {
            data: null,
            isLoading: false,
            error: oosIndexQuery.error
        }
    }

    if (!trainIndexQuery.data || !oosIndexQuery.data) {
        return {
            data: null,
            isLoading: trainIndexQuery.isLoading || oosIndexQuery.isLoading,
            error: null
        }
    }

    try {
        return {
            data: buildBackfilledSplitStats(trainIndexQuery.data, oosIndexQuery.data),
            isLoading: false,
            error: null
        }
    } catch (error) {
        return {
            data: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error))
        }
    }
}

function buildCurrentPredictionReportQueryOptions(set: CurrentPredictionSet, scope?: CurrentPredictionTrainingScope) {
    return {
        queryKey: ['current-prediction', 'latest', set, scope ?? 'default'] as const,
        queryFn: () => fetchCurrentPrediction(set, scope),
        retry: false
    }
}

function buildCurrentPredictionIndexQueryOptions(
    set: CurrentPredictionSet,
    days?: number,
    scope?: CurrentPredictionTrainingScope
) {
    const resolvedScope = resolveCurrentPredictionIndexScope(set, scope)

    return {
        queryKey: ['current-prediction', 'dates', set, resolvedScope, days ?? 'all'] as const,
        queryFn: () => fetchCurrentPredictionIndex(set, days, resolvedScope),
        retry: false,
        // Индекс истории по текущему прогнозу фактически статичен в рамках пользовательской сессии:
        // при переключении окна 365/730/all повторно используем ранее загруженные данные из кэша.
        staleTime: CURRENT_PREDICTION_INDEX_CACHE_TTL_MS,
        gcTime: CURRENT_PREDICTION_INDEX_CACHE_TTL_MS,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    }
}

function buildCurrentPredictionHistoryPageQueryOptions(args: CurrentPredictionHistoryPageQueryArgs) {
    const resolvedScope = resolveCurrentPredictionIndexScope(args.set, args.scope)

    return {
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
    }
}

export async function prefetchCurrentPredictionLatestReport(queryClient: QueryClient): Promise<void> {
    const queryOptions = buildCurrentPredictionReportQueryOptions(
        DEFAULT_CURRENT_PREDICTION_SET,
        DEFAULT_CURRENT_PREDICTION_LIVE_SCOPE
    )
    await queryClient.prefetchQuery(queryOptions)
}

export async function prefetchCurrentPredictionHistoryIndex(queryClient: QueryClient): Promise<void> {
    const queryOptions = buildCurrentPredictionIndexQueryOptions(
        DEFAULT_HISTORY_PREDICTION_SET,
        undefined,
        DEFAULT_BACKFILLED_HISTORY_SCOPE
    )
    await queryClient.prefetchQuery(queryOptions)
}

export async function prefetchCurrentPredictionHistoryPage(
    queryClient: QueryClient,
    args: Partial<CurrentPredictionHistoryPageQueryArgs> = {}
): Promise<void> {
    const queryOptions = buildCurrentPredictionHistoryPageQueryOptions({
        set: args.set ?? DEFAULT_HISTORY_PREDICTION_SET,
        scope: args.scope ?? DEFAULT_BACKFILLED_HISTORY_SCOPE,
        page: args.page ?? DEFAULT_CURRENT_PREDICTION_HISTORY_PAGE,
        pageSize: args.pageSize ?? DEFAULT_CURRENT_PREDICTION_HISTORY_PAGE_SIZE,
        days: args.days,
        fromDateUtc: args.fromDateUtc,
        toDateUtc: args.toDateUtc
    })
    await queryClient.prefetchQuery(queryOptions)
}
