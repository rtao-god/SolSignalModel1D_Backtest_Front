import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'
import { BulletList } from '@/shared/ui/BulletList'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import {
    buildPolicySetupHistoryStatusQueryKey,
    buildPolicySetupCatalogQueryKey,
    buildPolicySetupCandlesQueryKey,
    buildPolicySetupLedgerQueryKey,
    fetchPolicySetupCandles,
    fetchPolicySetupLedger,
    usePolicySetupCandlesQuery,
    usePolicySetupCatalogQuery,
    usePolicySetupHistoryRebuildMutation,
    usePolicySetupHistoryStatusQuery,
    usePolicySetupLedgerQuery,
    type PolicySetupCandlesQueryArgs,
    type PolicySetupWindowQueryArgs
} from '@/shared/api/tanstackQueries/policySetupHistory'
import type {
    PolicySetupCandlesResponseDto,
    PolicySetupCatalogItemDto,
    PolicySetupHistoryPublishedStatusDto,
    PolicySetupHistoryResolution,
    PolicySetupLedgerResponseDto
} from '@/shared/types/policySetupHistory'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import PolicySetupsChart from './PolicySetupsChart'
import type { BalanceViewMode, LineVisibilityMode, PolicySetupChartVisibleRange, RangePreset } from './types'
import cls from './PolicySetupsPage.module.scss'

const RANGE_PRESETS: readonly { id: RangePreset; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: '30d', label: '30d' },
    { id: '90d', label: '90d' },
    { id: '365d', label: '365d' },
    { id: '730d', label: '2y' }
]
const INITIAL_ALL_WINDOW_DAYS = 24
const OLDER_PREFETCH_WINDOW_DAYS = 90
const OLDER_PREFETCH_THRESHOLD_DAYS = 8
const VISIBLE_RANGE_STATE_GRANULARITY_SECONDS = 60 * 60

function resolveRangePreset(raw: string | null): RangePreset {
    return RANGE_PRESETS.some(preset => preset.id === raw) ? (raw as RangePreset) : 'all'
}

function resolveResolution(raw: string | null): PolicySetupHistoryResolution {
    return raw === '6h' ? '6h' : raw === '1m' ? '1m' : '3h'
}

function resolveBalanceView(raw: string | null): BalanceViewMode {
    return raw === 'overlay' ? 'overlay' : 'pane'
}

function resolveLineVisibilityMode(raw: string | null): LineVisibilityMode {
    return raw === 'subtle' ? 'subtle' : 'strong'
}

function resolveFlag(raw: string | null, defaultValue = true): boolean {
    if (raw == null) return defaultValue
    return raw !== '0'
}

function addDays(isoDate: string, days: number): string {
    const date = new Date(`${isoDate}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
}

function toUnixSeconds(isoUtc: string): number {
    return Math.floor(new Date(isoUtc).getTime() / 1000)
}

function resolveWindowDays(rangePreset: RangePreset): number {
    return rangePreset === 'all'
        ? INITIAL_ALL_WINDOW_DAYS
        : rangePreset === '30d'
          ? 30
          : rangePreset === '90d'
            ? 90
            : rangePreset === '365d'
              ? 365
              : 730
}

function buildInitialWindowQueryArgs(rangePreset: RangePreset): PolicySetupWindowQueryArgs {
    return {
        windowDays: resolveWindowDays(rangePreset)
    }
}

function buildOlderWindowQueryArgs(
    ledger: PolicySetupLedgerResponseDto,
    chunkWindowDays: number
): PolicySetupWindowQueryArgs | null {
    const availableHistoryRange = ledger.boundaryManifest.historyDayRange

    if (ledger.appliedRange.fromDateUtc <= availableHistoryRange.fromDateUtc) {
        return null
    }

    const extendedFromDateUtc = addDays(ledger.appliedRange.fromDateUtc, -chunkWindowDays)

    return {
        from:
            extendedFromDateUtc < availableHistoryRange.fromDateUtc
                ? availableHistoryRange.fromDateUtc
                : extendedFromDateUtc,
        to: ledger.appliedRange.toDateUtc
    }
}

function buildSeedCandlesQueryArgs(
    rangePreset: RangePreset,
    resolution: PolicySetupHistoryResolution,
    ledger: PolicySetupLedgerResponseDto | null
): PolicySetupCandlesQueryArgs {
    if (ledger) {
        return {
            from: ledger.appliedRange.fromDateUtc,
            to: ledger.appliedRange.toDateUtc,
            resolution
        }
    }

    return {
        ...buildInitialWindowQueryArgs(rangePreset),
        resolution
    }
}

function mergeCandles(
    current: PolicySetupCandlesResponseDto['candles'],
    incoming: PolicySetupCandlesResponseDto['candles']
) {
    const candlesByOpenTime = new Map<string, PolicySetupCandlesResponseDto['candles'][number]>()
    for (const candle of current) candlesByOpenTime.set(candle.openTimeUtc, candle)
    for (const candle of incoming) candlesByOpenTime.set(candle.openTimeUtc, candle)

    return [...candlesByOpenTime.values()].sort((left, right) => left.openTimeUtc.localeCompare(right.openTimeUtc))
}

function selectBroaderLedgerResponse(
    current: PolicySetupLedgerResponseDto | null,
    incoming: PolicySetupLedgerResponseDto
): PolicySetupLedgerResponseDto {
    if (!current) return incoming
    if (current.setup.setupId !== incoming.setup.setupId) {
        throw new Error('[policy-setup-history] cannot compare ledgers for different setup ids.')
    }

    const currentCoversIncoming =
        current.appliedRange.fromDateUtc <= incoming.appliedRange.fromDateUtc
        && current.appliedRange.toDateUtc >= incoming.appliedRange.toDateUtc
    if (currentCoversIncoming) {
        return current
    }

    const incomingCoversCurrent =
        incoming.appliedRange.fromDateUtc <= current.appliedRange.fromDateUtc
        && incoming.appliedRange.toDateUtc >= current.appliedRange.toDateUtc
    if (incomingCoversCurrent) {
        return incoming
    }

    throw new Error('[policy-setup-history] cannot merge partially overlapping ledgers while capital timeline is backend-owned.')
}

function mergeCandleResponses(
    current: PolicySetupCandlesResponseDto | null,
    incoming: PolicySetupCandlesResponseDto
): PolicySetupCandlesResponseDto {
    if (!current) return incoming
    if (current.setupId !== incoming.setupId) {
        throw new Error('[policy-setup-history] cannot merge candles for different setup ids.')
    }
    if (current.appliedRange.resolution !== incoming.appliedRange.resolution) {
        throw new Error('[policy-setup-history] cannot merge candles for different resolutions.')
    }

    return {
        ...incoming,
        boundaryManifest: current.boundaryManifest,
        appliedRange: {
            fromDateUtc:
                current.appliedRange.fromDateUtc < incoming.appliedRange.fromDateUtc
                    ? current.appliedRange.fromDateUtc
                    : incoming.appliedRange.fromDateUtc,
            toDateUtc:
                current.appliedRange.toDateUtc > incoming.appliedRange.toDateUtc
                    ? current.appliedRange.toDateUtc
                    : incoming.appliedRange.toDateUtc,
            resolution: incoming.appliedRange.resolution
        },
        candles: mergeCandles(current.candles, incoming.candles)
    }
}

function shouldPrefetchOlderChunk(
    ledger: PolicySetupLedgerResponseDto,
    visibleRange: PolicySetupChartVisibleRange | null
): boolean {
    if (!visibleRange || ledger.days.length === 0) return false
    if (ledger.appliedRange.fromDateUtc <= ledger.boundaryManifest.historyDayRange.fromDateUtc) return false

    const oldestLoadedStartUnixSeconds = toUnixSeconds(ledger.days[0].dayBlockStartUtc)
    const thresholdSeconds = OLDER_PREFETCH_THRESHOLD_DAYS * 24 * 60 * 60
    return visibleRange.from <= oldestLoadedStartUnixSeconds + thresholdSeconds
}

function formatStatusTimestamp(isoUtc: string | null): string | null {
    if (!isoUtc) return null

    const date = new Date(isoUtc)
    if (Number.isNaN(date.getTime())) return isoUtc

    return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

function requireSetupMetricNumber(
    setup: PolicySetupCatalogItemDto,
    field: keyof NonNullable<PolicySetupCatalogItemDto['performanceMetrics']>
): number {
    const value = setup.performanceMetrics[field]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(
            `[policy-setup-history] setup.performanceMetrics.${String(field)} must be a finite number. setupId=${setup.setupId}.`
        )
    }

    return value
}

function requireSetupMetricBoolean(
    setup: PolicySetupCatalogItemDto,
    field: keyof NonNullable<PolicySetupCatalogItemDto['performanceMetrics']>
): boolean {
    const value = setup.performanceMetrics[field]
    if (typeof value !== 'boolean') {
        throw new Error(
            `[policy-setup-history] setup.performanceMetrics.${String(field)} must be a boolean. setupId=${setup.setupId}.`
        )
    }

    return value
}

function resolvePublishedStatusTitle(status: PolicySetupHistoryPublishedStatusDto): string {
    switch (status.state) {
        case 'stale':
            return 'Локальный отчёт графика устарел'
        case 'missing':
            return 'Локальный отчёт графика ещё не опубликован'
        case 'building':
            return 'Локальный отчёт графика пересобирается'
        case 'failed':
            return 'Локальный отчёт графика недоступен'
        default:
            return 'Локальный отчёт графика актуален'
    }
}

function resolvePublishedStatusDescription(status: PolicySetupHistoryPublishedStatusDto): string {
    switch (status.state) {
        case 'stale':
            return 'Страница показывает прошлую опубликованную версию. Новая версия ещё не собрана.'
        case 'missing':
            return 'Готовый локальный отчёт для графика ещё не опубликован. Пока он не будет собран, журнал дней и свечной слой недоступны.'
        case 'building':
            return status.canServePublished
                ? 'Последняя опубликованная версия уже доступна. Новая версия собирается отдельно и появится после завершения пересборки.'
                : 'Готовый локальный отчёт сейчас собирается. После публикации страница сама подхватит журнал дней и свечной слой.'
        case 'failed':
            return 'Последняя пересборка завершилась ошибкой. Без опубликованной версии график открыть нельзя.'
        default:
            return 'Локальный отчёт графика готов к чтению.'
    }
}

interface PublishedStatusPanelProps {
    status: PolicySetupHistoryPublishedStatusDto
    onRebuild: () => void
    isRebuildPending: boolean
    rebuildError: Error | null
}

function PublishedStatusPanel({ status, onRebuild, isRebuildPending, rebuildError }: PublishedStatusPanelProps) {
    const generatedAtLabel = formatStatusTimestamp(status.publishedGeneratedAtUtc)
    const lastStartedAtLabel = formatStatusTimestamp(status.lastRebuildStartedAtUtc)
    const lastCompletedAtLabel = formatStatusTimestamp(status.lastRebuildCompletedAtUtc)
    const lastFailedAtLabel = formatStatusTimestamp(status.lastRebuildFailedAtUtc)
    const isWarningState = status.state === 'stale'
    const isBlockingState = !status.canServePublished

    return (
        <section
            className={classNames(cls.publishedStatusPanel, {
                [cls.publishedStatusPanelWarning]: isWarningState,
                [cls.publishedStatusPanelBlocking]: isBlockingState
            })}>
            <div className={cls.publishedStatusHead}>
                <div className={cls.publishedStatusCopy}>
                    <Text type='h3' className={cls.publishedStatusTitle}>
                        {resolvePublishedStatusTitle(status)}
                    </Text>
                    <Text className={cls.publishedStatusDescription}>
                        {resolvePublishedStatusDescription(status)}
                    </Text>
                </div>
                <div className={cls.publishedStatusActions}>
                    <Btn
                        type='button'
                        variant='secondary'
                        colorScheme={isBlockingState ? 'blue' : 'neutral'}
                        onClick={onRebuild}
                        disabled={isRebuildPending || status.state === 'building'}>
                        {isRebuildPending || status.state === 'building' ? 'Пересборка идёт' : 'Пересобрать отчёт'}
                    </Btn>
                </div>
            </div>

            <div className={cls.publishedStatusMeta}>
                {generatedAtLabel && <Text type='span'>Опубликовано: {generatedAtLabel}</Text>}
                {status.publishedSetupCount != null && <Text type='span'>Политик в отчёте: {status.publishedSetupCount}</Text>}
                {lastStartedAtLabel && <Text type='span'>Последний старт пересборки: {lastStartedAtLabel}</Text>}
                {lastCompletedAtLabel && <Text type='span'>Последнее завершение пересборки: {lastCompletedAtLabel}</Text>}
                {lastFailedAtLabel && <Text type='span'>Последний сбой пересборки: {lastFailedAtLabel}</Text>}
            </div>

            {(status.lastRebuildFailureMessage || rebuildError) && (
                <Text className={cls.publishedStatusError}>
                    {rebuildError?.message ?? status.lastRebuildFailureMessage}
                </Text>
            )}
        </section>
    )
}

export default function PolicySetupsPage() {
    const { setupId } = useParams<{ setupId?: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const queryClient = useQueryClient()
    const isDetailMode = Boolean(setupId)
    const catalogPath = ROUTE_PATH[AppRoute.BACKTEST_POLICY_SETUPS]
    const rebuildMutation = usePolicySetupHistoryRebuildMutation()

    const rangePreset = resolveRangePreset(searchParams.get('range'))
    const resolution = resolveResolution(searchParams.get('resolution'))
    const balanceView = resolveBalanceView(searchParams.get('balanceView'))
    const lineVisibilityMode = resolveLineVisibilityMode(searchParams.get('lineMode'))
    const showCandles = resolveFlag(searchParams.get('showCandles'), true)
    const showDayBoundaries = resolveFlag(searchParams.get('showDays'), true)
    const showStopLoss = resolveFlag(searchParams.get('showSl'), true)
    const showTakeProfit = resolveFlag(searchParams.get('showTp'), true)
    const showLiquidations = resolveFlag(searchParams.get('showLiq'), true)
    const hideNoTradeDays = resolveFlag(searchParams.get('hideNoTrade'), false)

    const [loadedLedger, setLoadedLedger] = useState<PolicySetupLedgerResponseDto | null>(null)
    const [loadedCandlesByResolution, setLoadedCandlesByResolution] = useState<
        Partial<Record<PolicySetupHistoryResolution, PolicySetupCandlesResponseDto>>
    >({})
    const [visibleRange, setVisibleRange] = useState<PolicySetupChartVisibleRange | null>(null)
    const [olderPrefetchError, setOlderPrefetchError] = useState<Error | null>(null)
    const [isOlderPrefetching, setIsOlderPrefetching] = useState(false)
    const olderRequestKeyRef = useRef<string | null>(null)
    const activeLedgerLoadKeyRef = useRef<string | null>(null)
    const lastPublishedGenerationRef = useRef<string | null>(null)

    const ledgerLoadKey = setupId ? `${setupId}|${rangePreset}` : null
    const initialWindowArgs = useMemo(
        () => buildInitialWindowQueryArgs(rangePreset),
        [rangePreset]
    )
    const catalogQuery = usePolicySetupCatalogQuery(!isDetailMode)
    const ledgerQuery = usePolicySetupLedgerQuery(setupId, initialWindowArgs, Boolean(setupId))
    const resolvedLedger = loadedLedger ?? ledgerQuery.data ?? null
    const resolvedSetup = resolvedLedger?.setup ?? null
    const cachedCandlesForResolution = loadedCandlesByResolution[resolution] ?? null
    const seedCandlesArgs = useMemo(
        () => buildSeedCandlesQueryArgs(rangePreset, resolution, resolvedLedger),
        [rangePreset, resolution, resolvedLedger]
    )
    const shouldSeedCandlesForResolution = !cachedCandlesForResolution
    const candlesQuery = usePolicySetupCandlesQuery(setupId, seedCandlesArgs, Boolean(setupId) && shouldSeedCandlesForResolution)
    const resolvedCandles = cachedCandlesForResolution ?? candlesQuery.data ?? null
    const shouldTrackPublishedStatus =
        !isDetailMode
        || !resolvedLedger
        || Boolean(ledgerQuery.error)
        || rebuildMutation.isPending
    const publishedStatusQuery = usePolicySetupHistoryStatusQuery(shouldTrackPublishedStatus)
    const publishedStatus = publishedStatusQuery.data ?? null

    const handleChartVisibleRangeChange = useCallback((nextRange: PolicySetupChartVisibleRange | null) => {
        setVisibleRange(current => {
            if (current == null || nextRange == null) {
                return current === nextRange ? current : nextRange
            }

            const currentFromBucket = Math.floor(current.from / VISIBLE_RANGE_STATE_GRANULARITY_SECONDS)
            const currentToBucket = Math.floor(current.to / VISIBLE_RANGE_STATE_GRANULARITY_SECONDS)
            const nextFromBucket = Math.floor(nextRange.from / VISIBLE_RANGE_STATE_GRANULARITY_SECONDS)
            const nextToBucket = Math.floor(nextRange.to / VISIBLE_RANGE_STATE_GRANULARITY_SECONDS)

            // Родителю не нужен пиксельный visible-range; ему нужен только coarse сигнал,
            // что левая граница действительно приблизилась к зоне фоновой подгрузки.
            return currentFromBucket === nextFromBucket && currentToBucket === nextToBucket
                ? current
                : nextRange
        })
    }, [])

    const handlePublishedRebuild = useCallback(async () => {
        try {
            await rebuildMutation.mutateAsync()
        } catch {
            // Ошибка rebuild уже лежит в mutation state и показывается в status-panel.
            // Кнопка не должна дублировать её глобальным unhandled rejection в окне браузера.
        } finally {
            await queryClient.invalidateQueries({ queryKey: buildPolicySetupHistoryStatusQueryKey() })
            await queryClient.invalidateQueries({ queryKey: buildPolicySetupCatalogQueryKey() })
            await queryClient.invalidateQueries({ queryKey: ['backtest', 'policy-setups', 'ledger'] })
            await queryClient.invalidateQueries({ queryKey: ['backtest', 'policy-setups', 'candles'] })
        }
    }, [queryClient, rebuildMutation])

    useEffect(() => {
        activeLedgerLoadKeyRef.current = ledgerLoadKey
        setLoadedLedger(null)
        setLoadedCandlesByResolution({})
        setVisibleRange(null)
        setOlderPrefetchError(null)
        setIsOlderPrefetching(false)
        olderRequestKeyRef.current = null
    }, [ledgerLoadKey])

    useEffect(() => {
        if (!ledgerQuery.data) return
        setLoadedLedger(current => selectBroaderLedgerResponse(current, ledgerQuery.data))
    }, [ledgerQuery.data])

    useEffect(() => {
        if (!candlesQuery.data) return

        const responseResolution = candlesQuery.data.appliedRange.resolution
        setLoadedCandlesByResolution(current => ({
            ...current,
            [responseResolution]: mergeCandleResponses(current[responseResolution] ?? null, candlesQuery.data)
        }))
    }, [candlesQuery.data])

    useEffect(() => {
        const nextPublishedGeneration = publishedStatus?.publishedGeneratedAtUtc ?? null
        const previousPublishedGeneration = lastPublishedGenerationRef.current
        lastPublishedGenerationRef.current = nextPublishedGeneration

        if (!previousPublishedGeneration || !nextPublishedGeneration) return
        if (previousPublishedGeneration === nextPublishedGeneration) return

        setLoadedLedger(null)
        setLoadedCandlesByResolution({})
        setVisibleRange(null)
        setOlderPrefetchError(null)
        setIsOlderPrefetching(false)
        olderRequestKeyRef.current = null

        void queryClient.invalidateQueries({ queryKey: buildPolicySetupCatalogQueryKey() })
        void queryClient.invalidateQueries({ queryKey: ['backtest', 'policy-setups', 'ledger'] })
        void queryClient.invalidateQueries({ queryKey: ['backtest', 'policy-setups', 'candles'] })
    }, [publishedStatus?.publishedGeneratedAtUtc, queryClient])

    // Страница держит ledger как канон detail-состояния, а candles живут отдельным слоем по resolution.
    // Из-за этого 3h/6h больше не имеют права сбрасывать загруженные дни и баланс.
    const prefetchOlderChunk = useCallback(async () => {
        if (!setupId || rangePreset !== 'all' || !loadedLedger) return

        const olderLedgerArgs = buildOlderWindowQueryArgs(loadedLedger, OLDER_PREFETCH_WINDOW_DAYS)
        if (!olderLedgerArgs) return

        const requestLedgerLoadKey = ledgerLoadKey
        const nextRequestKey = JSON.stringify([
            setupId,
            olderLedgerArgs.from,
            olderLedgerArgs.to,
            resolution
        ])
        if (olderRequestKeyRef.current === nextRequestKey) return

        olderRequestKeyRef.current = nextRequestKey
        setOlderPrefetchError(null)
        setIsOlderPrefetching(true)

        try {
            const olderCandlesArgs: PolicySetupCandlesQueryArgs = {
                ...olderLedgerArgs,
                resolution
            }

            const [olderLedgerChunk, olderCandlesChunk] = await Promise.all([
                fetchPolicySetupLedger(setupId, olderLedgerArgs),
                fetchPolicySetupCandles(setupId, olderCandlesArgs)
            ])

            if (activeLedgerLoadKeyRef.current !== requestLedgerLoadKey) return

            queryClient.setQueryData(
                buildPolicySetupLedgerQueryKey(setupId, olderLedgerArgs),
                olderLedgerChunk
            )
            queryClient.setQueryData(
                buildPolicySetupCandlesQueryKey(setupId, olderCandlesArgs),
                olderCandlesChunk
            )

            setLoadedLedger(current => selectBroaderLedgerResponse(current, olderLedgerChunk))
            setLoadedCandlesByResolution(current => ({
                ...current,
                [resolution]: mergeCandleResponses(current[resolution] ?? null, olderCandlesChunk)
            }))
        } catch (error) {
            if (activeLedgerLoadKeyRef.current !== requestLedgerLoadKey) return
            setOlderPrefetchError(
                normalizeErrorLike(error, 'Failed to prefetch older detail chunk.', {
                    source: 'policy-setup-older-prefetch',
                    domain: 'ui_section',
                    owner: 'policy-setups-page',
                    expected: 'Older policy setup chunk prefetch should resolve a ledger and candle chunk pair.',
                    requiredAction: 'Inspect policy setup chunk queries and the selected visible range.',
                    extra: { setupId, resolution, rangePreset }
                })
            )
        } finally {
            if (olderRequestKeyRef.current === nextRequestKey) {
                olderRequestKeyRef.current = null
            }
            if (activeLedgerLoadKeyRef.current === requestLedgerLoadKey) {
                setIsOlderPrefetching(false)
            }
        }
    }, [ledgerLoadKey, loadedLedger, queryClient, rangePreset, resolution, setupId])

    useEffect(() => {
        if (!resolvedLedger || rangePreset !== 'all') return
        if (!shouldPrefetchOlderChunk(resolvedLedger, visibleRange)) return
        void prefetchOlderChunk()
    }, [prefetchOlderChunk, rangePreset, resolvedLedger, visibleRange])

    const toggleItems: readonly { key: string; checked: boolean; label: string }[] = [
        { key: 'showCandles', checked: showCandles, label: 'Candles' },
        { key: 'showDays', checked: showDayBoundaries, label: 'Day blocks' },
        { key: 'showSl', checked: showStopLoss, label: 'Stop loss' },
        { key: 'showTp', checked: showTakeProfit, label: 'Take profit' },
        { key: 'showLiq', checked: showLiquidations, label: 'Liquidations' },
        { key: 'hideNoTrade', checked: hideNoTradeDays, label: 'Hide no-trade' }
    ]
    const balanceLegendItems = useMemo(
        () => {
            const items = [
                {
                    key: 'total-capital-path',
                    content: (
                        <div className={cls.balanceLegendRow}>
                            <span className={classNames(cls.balanceLegendSwatch, {}, [cls.balanceLegendSwatchTotalCapital])} />
                            <Text className={cls.balanceLegendText}>
                                Основная ветка показывает общий капитал: деньги в торговле плюс [[withdrawn-profit|выведенная прибыль]].
                                Пока общий капитал не выше [[start-cap|стартового капитала]], ветка остаётся серой.
                                Выше стартовой базы эта же ветка становится зелёной.
                            </Text>
                        </div>
                    )
                }
            ]

            if (resolvedLedger?.capitalTimeline.hasWorkingCapitalGap) {
                items.push({
                    key: 'working-balance-gap',
                    content: (
                        <div className={cls.balanceLegendRow}>
                            <span className={classNames(cls.balanceLegendSwatch, {}, [cls.balanceLegendSwatchWorkingGap])} />
                            <Text className={cls.balanceLegendText}>
                                Тонкая светлая ветка показывает только [[current-balance|рабочий баланс]].
                                Она появляется там, где часть результата уже ушла в [[withdrawn-profit|выведенную прибыль]], но рабочий баланс всё ещё держится на [[start-cap|стартовом капитале]] или выше.
                                Если рабочий баланс падает ниже стартовой базы, нижний график снова читается одной основной веткой без второго дубля.
                            </Text>
                        </div>
                    )
                })
            }

            return items
        },
        [resolvedLedger]
    )

    const updateSearch = (key: string, value: string | null) => {
        const next = new URLSearchParams(searchParams)
        if (value == null || value === '') next.delete(key)
        else next.set(key, value)
        setSearchParams(next, { replace: true })
    }
    const updateFlagSearch = (key: string, value: boolean) => {
        updateSearch(key, value ? '1' : '0')
    }

    if (!setupId) {
        return (
            <div className={cls.root}>
                <section className={cls.hero}>
                    <Text type='h1' className={cls.heroTitle}>
                        Policy setup history
                    </Text>
                    <Text className={cls.heroSubtitle}>
                        Отдельная витрина для полных торговых конфигураций: свечи SOL, дневные блоки, исполнение TP/SL и кривая баланса.
                    </Text>
                </section>

                {publishedStatus && publishedStatus.state !== 'fresh' && (
                    <PublishedStatusPanel
                        status={publishedStatus}
                        onRebuild={() => void handlePublishedRebuild()}
                        isRebuildPending={rebuildMutation.isPending}
                        rebuildError={rebuildMutation.error}
                    />
                )}

                <SectionDataState
                    isLoading={catalogQuery.isLoading}
                    isError={catalogQuery.isError}
                    error={catalogQuery.error}
                    hasData={Boolean(catalogQuery.data)}
                    onRetry={() => catalogQuery.refetch()}
                    title='Не удалось загрузить каталог policy setup'
                    loadingText='Каталог policy setup загружается'
                    logContext={{ source: 'policy-setups-catalog' }}>
                    {catalogQuery.data &&
                        <div className={cls.rangeNote}>
                            <Text type='span' className={cls.rangeNoteItem}>
                                Доступный период: {catalogQuery.data.boundaryManifest.historyDayRange.fromDateUtc} - {catalogQuery.data.boundaryManifest.historyDayRange.toDateUtc}
                            </Text>
                        </div>}
                    <div className={cls.catalogGrid}>
                        {catalogQuery.data?.items.map(setup => (
                            <RouterLink
                                key={setup.setupId}
                                to={`${catalogPath}/${setup.setupId}`}
                                className={cls.catalogCard}>
                                <Text type='h3' className={cls.catalogTitle}>
                                    {setup.displayLabel}
                                </Text>
                                <div className={cls.catalogMeta}>
                                    <span>{requireSetupMetricNumber(setup, 'tradesCount')} trade days</span>
                                    <span>{setup.noTradeDaysCount} no-trade days</span>
                                    <span>{requireSetupMetricBoolean(setup, 'hadLiquidation') ? 'liq seen' : 'no liq'}</span>
                                </div>
                                <div className={cls.catalogMetrics}>
                                    <div>
                                        <span className={cls.metricLabel}>PnL</span>
                                        <strong>{requireSetupMetricNumber(setup, 'totalPnlPct').toFixed(2)}%</strong>
                                    </div>
                                    <div>
                                        <span className={cls.metricLabel}>Max DD</span>
                                        <strong>{requireSetupMetricNumber(setup, 'maxDdPct').toFixed(2)}%</strong>
                                    </div>
                                    <div>
                                        <span className={cls.metricLabel}>Window</span>
                                        <strong>
                                            {catalogQuery.data.boundaryManifest.historyDayRange.fromDateUtc} - {catalogQuery.data.boundaryManifest.historyDayRange.toDateUtc}
                                        </strong>
                                    </div>
                                </div>
                            </RouterLink>
                        ))}
                    </div>
                </SectionDataState>
            </div>
        )
    }

    if (!ledgerQuery.isLoading && !ledgerQuery.isError && !resolvedSetup) {
        return (
            <div className={cls.root}>
                <RouterLink to={catalogPath} className={cls.backLink}>
                    ← Back to catalog
                </RouterLink>
                <div className={cls.notFoundBox}>Policy setup `{setupId}` не найден в текущем baseline-каталоге.</div>
            </div>
        )
    }

    return (
        <div className={cls.root}>
            <RouterLink to={catalogPath} className={cls.backLink}>
                ← Back to catalog
            </RouterLink>

            <section className={cls.detailHero}>
                <div>
                    <Text type='h1' className={cls.heroTitle}>
                        {resolvedSetup?.displayLabel ?? setupId}
                    </Text>
                    <Text className={cls.heroSubtitle}>
                        History only, UTC only, daily bucket. Первый релиз страницы показывает closed history без live-дня.
                    </Text>
                </div>
                {resolvedSetup &&
                    <div className={cls.heroStats}>
                        <div>
                            <span>Trade days</span>
                            <strong>{requireSetupMetricNumber(resolvedSetup, 'tradesCount')}</strong>
                        </div>
                        <div>
                            <span>No-trade days</span>
                            <strong>{resolvedSetup.noTradeDaysCount}</strong>
                        </div>
                        <div>
                            <span>PnL / DD</span>
                            <strong>
                                {requireSetupMetricNumber(resolvedSetup, 'totalPnlPct').toFixed(2)}% / {requireSetupMetricNumber(resolvedSetup, 'maxDdPct').toFixed(2)}%
                            </strong>
                        </div>
                    </div>}
            </section>

            {publishedStatus && publishedStatus.state !== 'fresh' && (
                <PublishedStatusPanel
                    status={publishedStatus}
                    onRebuild={() => void handlePublishedRebuild()}
                    isRebuildPending={rebuildMutation.isPending}
                    rebuildError={rebuildMutation.error}
                />
            )}

            <section className={cls.toolbar}>
                <div className={cls.controlGroup}>
                    <span className={cls.groupLabel}>Range</span>
                    <div className={cls.chips}>
                        {RANGE_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                type='button'
                                className={classNames(cls.chip, { [cls.chipActive]: rangePreset === preset.id })}
                                onClick={() => updateSearch('range', preset.id === 'all' ? null : preset.id)}>
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={cls.controlGroup}>
                    <span className={cls.groupLabel}>Resolution</span>
                    <div className={cls.chips}>
                        {(['3h', '6h'] as const).map(value => (
                            <button
                                key={value}
                                type='button'
                                className={classNames(cls.chip, { [cls.chipActive]: resolution === value })}
                                onClick={() => updateSearch('resolution', value === '3h' ? null : value)}>
                                {value}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={cls.controlGroup}>
                    <span className={cls.groupLabel}>Balance</span>
                    <div className={cls.chips}>
                        {(['pane', 'overlay'] as const).map(value => (
                            <button
                                key={value}
                                type='button'
                                className={classNames(cls.chip, { [cls.chipActive]: balanceView === value })}
                                onClick={() => updateSearch('balanceView', value)}>
                                {value === 'pane' ? 'Отдельный блок' : 'Поверх цены'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={cls.controlGroup}>
                    <span className={cls.groupLabel}>Lines</span>
                    <div className={cls.chips}>
                        {(['subtle', 'strong'] as const).map(value => (
                            <button
                                key={value}
                                type='button'
                                className={classNames(cls.chip, { [cls.chipActive]: lineVisibilityMode === value })}
                                onClick={() => updateSearch('lineMode', value === 'strong' ? null : value)}>
                                {value === 'strong' ? 'Явные линии' : 'Мягкие линии'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={cls.toggles}>
                    {toggleItems.map(toggle => (
                        <label key={toggle.key} className={cls.toggle}>
                            <input
                                type='checkbox'
                                checked={toggle.checked}
                                onChange={event => updateFlagSearch(toggle.key, event.target.checked)}
                            />
                            <span>{toggle.label}</span>
                        </label>
                    ))}
                </div>
            </section>

            <SectionDataState
                isLoading={!resolvedLedger && (ledgerQuery.isLoading || candlesQuery.isLoading)}
                isError={!resolvedLedger && (ledgerQuery.isError || candlesQuery.isError)}
                error={ledgerQuery.error ?? candlesQuery.error}
                hasData={Boolean(resolvedLedger)}
                onRetry={() => {
                    void ledgerQuery.refetch()
                    void candlesQuery.refetch()
                }}
                title='Не удалось загрузить журнал policy setup'
                loadingText='Журнал policy setup загружается'
                logContext={{ source: 'policy-setups-detail' }}>
                {resolvedLedger && (
                    <>
                        <div className={cls.rangeNote}>
                            <Text type='span' className={cls.rangeNoteItem}>
                                Журнал дней: {resolvedLedger.appliedRange.fromDateUtc} - {resolvedLedger.appliedRange.toDateUtc}
                            </Text>
                            <Text type='span' className={cls.rangeNoteItem}>
                                Свечи: {resolvedCandles
                                    ? `${resolvedCandles.appliedRange.fromDateUtc} - ${resolvedCandles.appliedRange.toDateUtc} (${resolvedCandles.appliedRange.resolution})`
                                    : `загрузка ${resolution}`}
                            </Text>
                            <Text type='span' className={cls.rangeNoteItem}>
                                Доступный период: {resolvedLedger.boundaryManifest.historyDayRange.fromDateUtc} - {resolvedLedger.boundaryManifest.historyDayRange.toDateUtc}
                            </Text>
                            <Text type='span' className={cls.rangeNoteItem}>
                                {`[[start-cap|Стартовый капитал]]: $${resolvedLedger.startCapitalUsd.toLocaleString('en-US')}`}
                            </Text>
                            <Text type='span' className={cls.rangeNoteItem}>
                                Пик полного результата: ${resolvedLedger.visibleBalanceCeilingUsd.toLocaleString('en-US')}
                            </Text>
                            {rangePreset === 'all' && isOlderPrefetching &&
                                <Text type='span' className={cls.rangeNoteItem}>Старые дни загружаются фоном.</Text>}
                            {olderPrefetchError &&
                                <Text type='span' className={cls.rangeNoteItem}>{olderPrefetchError.message}</Text>}
                        </div>
                        <section className={cls.balanceLegend}>
                            <Text type='h3' className={cls.balanceLegendTitle}>
                                Как читать нижний график
                            </Text>
                            <BulletList
                                items={balanceLegendItems}
                                className={cls.balanceLegendList}
                                itemClassName={cls.balanceLegendBullet}
                                contentClassName={cls.balanceLegendBulletContent}
                            />
                        </section>
                        {resolvedCandles ?
                            <PolicySetupsChart
                                ledger={resolvedLedger}
                                candlesResponse={resolvedCandles}
                                balanceView={balanceView}
                                showCandles={showCandles}
                                showDayBoundaries={showDayBoundaries}
                                showStopLoss={showStopLoss}
                                showTakeProfit={showTakeProfit}
                                showLiquidations={showLiquidations}
                                hideNoTradeDays={hideNoTradeDays}
                                lineVisibilityMode={lineVisibilityMode}
                                viewportResetKey={ledgerLoadKey ?? 'policy-setup-ledger'}
                                onVisibleRangeChange={handleChartVisibleRangeChange}
                            />
                        :   <div className={cls.notFoundBox}>Свечной слой загружается отдельно от дневного журнала.</div>}
                    </>
                )}
            </SectionDataState>
        </div>
    )
}
