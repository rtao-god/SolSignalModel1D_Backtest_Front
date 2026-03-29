import { API_BASE_URL } from '@/shared/configs/config'
import { QUERY_POLICY_REGISTRY } from '@/shared/configs/queryPolicies'
import { API_ROUTES } from '../routes'
import { fetchWithTimeout } from './utils/fetchWithTimeout'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'
import { normalizeUtcDayKey, normalizeUtcInstant } from '../utils/normalizeDomainTime'
import { buildUnexpectedValueErrorMessage, describeUnexpectedValue } from '@/shared/lib/errors/describeUnexpectedValue'
import {
    useMutation,
    useQuery,
    type QueryClient,
    type UseMutationResult,
    type UseQueryResult
} from '@tanstack/react-query'
import type {
    PolicySetupCatalogItemDto,
    PolicySetupCapitalTimelineDto,
    PolicySetupCapitalTimelinePointDto,
    PolicySetupDateRangeDto,
    PolicySetupCandleRangeDto,
    PolicySetupHistoryCandleDto,
    PolicySetupHistoryDayDto,
    PolicySetupHistoryResolution,
    PolicySetupHistoryPublishedState,
    PolicySetupHistoryPublishedStatusDto,
    PolicySetupNoTradeReasonDto,
    PolicySetupLedgerResponseDto,
    PolicySetupCandlesResponseDto
} from '@/shared/types/policySetupHistory'

const POLICY_SETUP_STATUS_QUERY_KEY = ['backtest', 'policy-setups', 'status'] as const
const POLICY_SETUP_CATALOG_QUERY_KEY = ['backtest', 'policy-setups', 'catalog'] as const
const POLICY_SETUP_LEDGER_QUERY_KEY = ['backtest', 'policy-setups', 'ledger'] as const
const POLICY_SETUP_CANDLES_QUERY_KEY = ['backtest', 'policy-setups', 'candles'] as const
const POLICY_SETUP_HISTORY_TIME_SCOPE = { scope: 'policy-setup-history' } as const

const { path: policySetupCatalogPath } = API_ROUTES.backtest.policySetupsCatalogGet
const { path: policySetupStatusPath } = API_ROUTES.backtest.policySetupStatusGet
const { path: policySetupRebuildPath } = API_ROUTES.backtest.policySetupRebuildPost
const { path: policySetupLedgerPath } = API_ROUTES.backtest.policySetupLedgerGet
const { path: policySetupCandlesPath } = API_ROUTES.backtest.policySetupCandlesGet

export interface PolicySetupWindowQueryArgs {
    from?: string | null
    to?: string | null
    windowDays?: number | null
}

export interface PolicySetupCandlesQueryArgs extends PolicySetupWindowQueryArgs {
    resolution?: PolicySetupHistoryResolution | null
}

export function buildPolicySetupHistoryStatusQueryKey() {
    return POLICY_SETUP_STATUS_QUERY_KEY
}

export function buildPolicySetupCatalogQueryKey() {
    return POLICY_SETUP_CATALOG_QUERY_KEY
}

export function buildPolicySetupLedgerQueryKey(
    setupId: string | null | undefined,
    args?: PolicySetupWindowQueryArgs
) {
    return [
        ...POLICY_SETUP_LEDGER_QUERY_KEY,
        setupId ?? null,
        args?.from ?? null,
        args?.to ?? null,
        args?.windowDays ?? null
    ] as const
}

export function buildPolicySetupCandlesQueryKey(
    setupId: string | null | undefined,
    args?: PolicySetupCandlesQueryArgs
) {
    return [
        ...POLICY_SETUP_CANDLES_QUERY_KEY,
        setupId ?? null,
        args?.from ?? null,
        args?.to ?? null,
        args?.windowDays ?? null,
        args?.resolution ?? null
    ] as const
}

function asObject(raw: unknown, tag: string): Record<string, unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error(buildUnexpectedValueErrorMessage('policy-setup-history', tag, 'an object', raw))
    }

    return raw as Record<string, unknown>
}

function readString(raw: unknown, tag: string): string {
    if (typeof raw !== 'string') {
        throw new Error(buildUnexpectedValueErrorMessage('policy-setup-history', tag, 'a string', raw))
    }

    const trimmed = raw.trim()
    if (!trimmed) {
        throw new Error(`[policy-setup-history] ${tag} expected a non-empty string, received ${describeUnexpectedValue(raw)}.`)
    }

    return trimmed
}

function readNullableString(raw: unknown, tag: string): string | null {
    if (raw == null) return null
    return readString(raw, tag)
}

function readUtcDayKey(raw: unknown, tag: string): string {
    return normalizeUtcDayKey(raw, tag, POLICY_SETUP_HISTORY_TIME_SCOPE)
}

function readUtcInstant(raw: unknown, tag: string): string {
    return normalizeUtcInstant(raw, tag, POLICY_SETUP_HISTORY_TIME_SCOPE)
}

function readNullableUtcDayKey(raw: unknown, tag: string): string | null {
    if (raw == null) return null
    return readUtcDayKey(raw, tag)
}

function readNullableUtcInstant(raw: unknown, tag: string): string | null {
    if (raw == null) return null
    return readUtcInstant(raw, tag)
}

function readBoolean(raw: unknown, tag: string): boolean {
    if (typeof raw !== 'boolean') {
        throw new Error(buildUnexpectedValueErrorMessage('policy-setup-history', tag, 'a boolean', raw))
    }

    return raw
}

function readNumber(raw: unknown, tag: string): number {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        throw new Error(buildUnexpectedValueErrorMessage('policy-setup-history', tag, 'a finite number', raw))
    }

    return raw
}

function readNullableNumber(raw: unknown, tag: string): number | null {
    if (raw == null) return null
    return readNumber(raw, tag)
}

function readStringArray(raw: unknown, tag: string): string[] {
    if (!Array.isArray(raw)) {
        throw new Error(buildUnexpectedValueErrorMessage('policy-setup-history', tag, 'an array', raw))
    }

    return raw.map((item, index) => readString(item, `${tag}[${index}]`))
}

function readResolutionArray(raw: unknown, tag: string): PolicySetupHistoryResolution[] {
    return readStringArray(raw, tag).map((value, index) => readResolution(value, `${tag}[${index}]`))
}

function readResolution(raw: unknown, tag: string): PolicySetupHistoryResolution {
    const value = readString(raw, tag)
    if (value !== '1m' && value !== '3h' && value !== '6h') {
        throw new Error(`[policy-setup-history] ${tag} contains unsupported resolution '${value}'.`)
    }

    return value
}

function readForecastDirection(raw: unknown, tag: string): PolicySetupHistoryDayDto['forecastDirection'] {
    if (raw == null) return null
    const value = readString(raw, tag)
    if (value !== 'up' && value !== 'down') {
        throw new Error(`[policy-setup-history] ${tag} contains unsupported forecast direction '${value}'.`)
    }

    return value
}

function readPublishedState(raw: unknown, tag: string): PolicySetupHistoryPublishedState {
    const value = readString(raw, tag)
    if (value !== 'fresh' && value !== 'stale' && value !== 'missing' && value !== 'building' && value !== 'failed') {
        throw new Error(`[policy-setup-history] ${tag} contains unsupported published state '${value}'.`)
    }

    return value
}

function readTpSlMode(raw: unknown, tag: string): PolicySetupCatalogItemDto['tpSlMode'] {
    const value = readString(raw, tag)
    if (value !== 'all' && value !== 'dynamic' && value !== 'static') {
        throw new Error(`[policy-setup-history] ${tag} contains unsupported tp/sl mode '${value}'.`)
    }

    return value
}

function readZonalMode(raw: unknown, tag: string): PolicySetupCatalogItemDto['zonalMode'] {
    const value = readString(raw, tag)
    if (value !== 'with-zonal' && value !== 'without-zonal') {
        throw new Error(`[policy-setup-history] ${tag} contains unsupported zonal mode '${value}'.`)
    }

    return value
}

function readDateRange(raw: unknown, tag: string): PolicySetupDateRangeDto {
    const record = asObject(raw, tag)

    return {
        fromDateUtc: readUtcDayKey(record.fromDateUtc, `${tag}.fromDateUtc`),
        toDateUtc: readUtcDayKey(record.toDateUtc, `${tag}.toDateUtc`)
    }
}

function readCandleRange(raw: unknown, tag: string): PolicySetupCandleRangeDto {
    const record = asObject(raw, tag)

    return {
        fromDateUtc: readUtcDayKey(record.fromDateUtc, `${tag}.fromDateUtc`),
        toDateUtc: readUtcDayKey(record.toDateUtc, `${tag}.toDateUtc`),
        resolution: readResolution(record.resolution, `${tag}.resolution`)
    }
}

function readCatalogItem(raw: unknown, tag: string): PolicySetupCatalogItemDto {
    const record = asObject(raw, tag)

    return {
        setupId: readString(record.setupId, `${tag}.setupId`),
        displayLabel: readString(record.displayLabel, `${tag}.displayLabel`),
        policyName: readString(record.policyName, `${tag}.policyName`),
        marginMode: readString(record.marginMode, `${tag}.marginMode`),
        branch: readString(record.branch, `${tag}.branch`),
        bucket: readString(record.bucket, `${tag}.bucket`),
        useStopLoss: readBoolean(record.useStopLoss, `${tag}.useStopLoss`),
        useAntiDirectionOverlay: readBoolean(record.useAntiDirectionOverlay, `${tag}.useAntiDirectionOverlay`),
        tpSlMode: readTpSlMode(record.tpSlMode, `${tag}.tpSlMode`),
        zonalMode: readZonalMode(record.zonalMode, `${tag}.zonalMode`),
        tradesCount: readNumber(record.tradesCount, `${tag}.tradesCount`),
        noTradeDaysCount: readNumber(record.noTradeDaysCount, `${tag}.noTradeDaysCount`),
        totalPnlPct: readNumber(record.totalPnlPct, `${tag}.totalPnlPct`),
        maxDrawdownPct: readNumber(record.maxDrawdownPct, `${tag}.maxDrawdownPct`),
        hadLiquidation: readBoolean(record.hadLiquidation, `${tag}.hadLiquidation`),
        fromDateUtc: readUtcDayKey(record.fromDateUtc, `${tag}.fromDateUtc`),
        toDateUtc: readUtcDayKey(record.toDateUtc, `${tag}.toDateUtc`)
    }
}

function readCandle(raw: unknown, tag: string): PolicySetupHistoryCandleDto {
    const record = asObject(raw, tag)

    return {
        openTimeUtc: readUtcInstant(record.openTimeUtc, `${tag}.openTimeUtc`),
        open: readNumber(record.open, `${tag}.open`),
        high: readNumber(record.high, `${tag}.high`),
        low: readNumber(record.low, `${tag}.low`),
        close: readNumber(record.close, `${tag}.close`)
    }
}

function readCapitalTimelinePoint(raw: unknown, tag: string): PolicySetupCapitalTimelinePointDto {
    const record = asObject(raw, tag)

    return {
        timeUtc: readUtcInstant(record.timeUtc, `${tag}.timeUtc`),
        valueUsd: readNullableNumber(record.valueUsd, `${tag}.valueUsd`)
    }
}

function readCapitalTimelineSeries(
    raw: unknown,
    tag: string
): PolicySetupCapitalTimelinePointDto[] {
    if (!Array.isArray(raw)) {
        throw new Error(buildUnexpectedValueErrorMessage('policy-setup-history', tag, 'an array', raw))
    }

    return raw.map((item, index) => readCapitalTimelinePoint(item, `${tag}[${index}]`))
}

function readCapitalTimeline(raw: unknown, tag: string): PolicySetupCapitalTimelineDto {
    const record = asObject(raw, tag)

    return {
        startCapitalUsd: readNumber(record.startCapitalUsd, `${tag}.startCapitalUsd`),
        hasWorkingCapitalGap: readBoolean(record.hasWorkingCapitalGap, `${tag}.hasWorkingCapitalGap`),
        firstWorkingCapitalGapDayUtc: readNullableUtcDayKey(
            record.firstWorkingCapitalGapDayUtc,
            `${tag}.firstWorkingCapitalGapDayUtc`
        ),
        latestTotalCapitalUsd: readNumber(record.latestTotalCapitalUsd, `${tag}.latestTotalCapitalUsd`),
        latestWorkingCapitalUsd: readNumber(record.latestWorkingCapitalUsd, `${tag}.latestWorkingCapitalUsd`),
        totalCapitalBaseSeries: readCapitalTimelineSeries(
            record.totalCapitalBaseSeries,
            `${tag}.totalCapitalBaseSeries`
        ),
        totalCapitalProfitSeries: readCapitalTimelineSeries(
            record.totalCapitalProfitSeries,
            `${tag}.totalCapitalProfitSeries`
        ),
        workingCapitalGapSeries: readCapitalTimelineSeries(
            record.workingCapitalGapSeries,
            `${tag}.workingCapitalGapSeries`
        )
    }
}

function readNoTradeDecision(raw: unknown, tag: string): PolicySetupNoTradeReasonDto | null {
    if (raw == null) return null
    const record = asObject(raw, tag)

    return {
        code: readString(record.code, `${tag}.code`),
        label: readString(record.label, `${tag}.label`),
        details: readString(record.details, `${tag}.details`)
    }
}

function readDay(raw: unknown, tag: string): PolicySetupHistoryDayDto {
    const record = asObject(raw, tag)

    return {
        tradingDayUtc: readUtcDayKey(record.tradingDayUtc, `${tag}.tradingDayUtc`),
        dayBlockStartUtc: readUtcInstant(record.dayBlockStartUtc, `${tag}.dayBlockStartUtc`),
        dayBlockEndUtc: readUtcInstant(record.dayBlockEndUtc, `${tag}.dayBlockEndUtc`),
        hasTrade: readBoolean(record.hasTrade, `${tag}.hasTrade`),
        noTradeReason: readNullableString(record.noTradeReason, `${tag}.noTradeReason`),
        noTradeDecision: readNoTradeDecision(record.noTradeDecision, `${tag}.noTradeDecision`),
        forecastDirection: readForecastDirection(record.forecastDirection, `${tag}.forecastDirection`),
        forecastLabel: readNullableString(record.forecastLabel, `${tag}.forecastLabel`),
        direction: readNullableString(record.direction, `${tag}.direction`) as PolicySetupHistoryDayDto['direction'],
        entryTimeUtc: readNullableUtcInstant(record.entryTimeUtc, `${tag}.entryTimeUtc`),
        exitTimeUtc: readNullableUtcInstant(record.exitTimeUtc, `${tag}.exitTimeUtc`),
        entryPrice: readNullableNumber(record.entryPrice, `${tag}.entryPrice`),
        exitPrice: readNullableNumber(record.exitPrice, `${tag}.exitPrice`),
        exitReason: readNullableString(record.exitReason, `${tag}.exitReason`),
        exitPnlPct: readNullableNumber(record.exitPnlPct, `${tag}.exitPnlPct`),
        leverage: readNullableNumber(record.leverage, `${tag}.leverage`),
        stopLossPrice: readNullableNumber(record.stopLossPrice, `${tag}.stopLossPrice`),
        stopLossPct: readNullableNumber(record.stopLossPct, `${tag}.stopLossPct`),
        takeProfitPrice: readNullableNumber(record.takeProfitPrice, `${tag}.takeProfitPrice`),
        takeProfitPct: readNullableNumber(record.takeProfitPct, `${tag}.takeProfitPct`),
        liquidationPrice: readNullableNumber(record.liquidationPrice, `${tag}.liquidationPrice`),
        liquidationDistancePct: readNullableNumber(record.liquidationDistancePct, `${tag}.liquidationDistancePct`),
        triggeredStopLoss: readBoolean(record.triggeredStopLoss, `${tag}.triggeredStopLoss`),
        triggeredTakeProfit: readBoolean(record.triggeredTakeProfit, `${tag}.triggeredTakeProfit`),
        triggeredLiquidation: readBoolean(record.triggeredLiquidation, `${tag}.triggeredLiquidation`),
        triggeredEndOfDay: readBoolean(record.triggeredEndOfDay, `${tag}.triggeredEndOfDay`),
        balanceBeforeUsd: readNumber(record.balanceBeforeUsd, `${tag}.balanceBeforeUsd`),
        balanceAfterUsd: readNumber(record.balanceAfterUsd, `${tag}.balanceAfterUsd`),
        withdrawnBeforeUsd: readNumber(record.withdrawnBeforeUsd, `${tag}.withdrawnBeforeUsd`),
        withdrawnAfterUsd: readNumber(record.withdrawnAfterUsd, `${tag}.withdrawnAfterUsd`),
        visibleBalanceBeforeUsd: readNumber(record.visibleBalanceBeforeUsd, `${tag}.visibleBalanceBeforeUsd`),
        visibleBalanceAfterUsd: readNumber(record.visibleBalanceAfterUsd, `${tag}.visibleBalanceAfterUsd`),
        bucketCapitalBeforeUsd: readNullableNumber(record.bucketCapitalBeforeUsd, `${tag}.bucketCapitalBeforeUsd`),
        stakeUsd: readNullableNumber(record.stakeUsd, `${tag}.stakeUsd`),
        stakePct: readNullableNumber(record.stakePct, `${tag}.stakePct`),
        notionalUsd: readNullableNumber(record.notionalUsd, `${tag}.notionalUsd`),
        positionQty: readNullableNumber(record.positionQty, `${tag}.positionQty`)
    }
}

function buildBaseQuery(args?: PolicySetupWindowQueryArgs): URLSearchParams {
    const params = new URLSearchParams()

    if (args?.from) params.set('from', args.from)
    if (args?.to) params.set('to', args.to)
    if (args?.windowDays != null) params.set('windowDays', String(args.windowDays))

    return params
}

function buildPolicySetupLedgerUrl(setupId: string, args?: PolicySetupWindowQueryArgs): string {
    const encodedSetupId = encodeURIComponent(setupId.trim())
    const params = buildBaseQuery(args)
    const query = params.toString()
    const suffix = query ? `/${encodedSetupId}/ledger?${query}` : `/${encodedSetupId}/ledger`
    return `${API_BASE_URL}${policySetupLedgerPath}${suffix}`
}

function buildPolicySetupCandlesUrl(setupId: string, args?: PolicySetupCandlesQueryArgs): string {
    const encodedSetupId = encodeURIComponent(setupId.trim())
    const params = buildBaseQuery(args)
    if (args?.resolution) params.set('resolution', args.resolution)

    const query = params.toString()
    const suffix = query ? `/${encodedSetupId}/candles?${query}` : `/${encodedSetupId}/candles`
    return `${API_BASE_URL}${policySetupCandlesPath}${suffix}`
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
    const response = await fetchWithTimeout(url, {
        method: 'GET',
        timeoutMs
    })

    if (!response.ok) {
        throw new Error(await buildPolicySetupHistoryRequestError(response))
    }

    return response.json()
}

async function postJson(url: string, timeoutMs: number): Promise<unknown> {
    const response = await fetchWithTimeout(url, {
        method: 'POST',
        timeoutMs
    })

    if (!response.ok) {
        throw new Error(await buildPolicySetupHistoryRequestError(response))
    }

    return response.json()
}

async function buildPolicySetupHistoryRequestError(response: Response): Promise<string> {
    const bodyText = await response.text().catch(() => '')
    return buildDetailedRequestErrorMessage('policy-setup-history request', response, bodyText)
}

export function parsePolicySetupHistoryPublishedStatusResponse(raw: unknown): PolicySetupHistoryPublishedStatusDto {
    const record = asObject(raw, 'publishedStatus')

    return {
        state: readPublishedState(record.state, 'publishedStatus.state'),
        message: readString(record.message, 'publishedStatus.message'),
        canServePublished: readBoolean(record.canServePublished, 'publishedStatus.canServePublished'),
        publishedGeneratedAtUtc: readNullableUtcInstant(
            record.publishedGeneratedAtUtc,
            'publishedStatus.publishedGeneratedAtUtc'
        ),
        publishedSetupCount: readNullableNumber(record.publishedSetupCount, 'publishedStatus.publishedSetupCount'),
        lastRebuildStartedAtUtc: readNullableUtcInstant(
            record.lastRebuildStartedAtUtc,
            'publishedStatus.lastRebuildStartedAtUtc'
        ),
        lastRebuildCompletedAtUtc: readNullableUtcInstant(
            record.lastRebuildCompletedAtUtc,
            'publishedStatus.lastRebuildCompletedAtUtc'
        ),
        lastRebuildFailedAtUtc: readNullableUtcInstant(
            record.lastRebuildFailedAtUtc,
            'publishedStatus.lastRebuildFailedAtUtc'
        ),
        lastRebuildFailureMessage: readNullableString(
            record.lastRebuildFailureMessage,
            'publishedStatus.lastRebuildFailureMessage'
        )
    }
}

export function parsePolicySetupCatalogResponse(raw: unknown): PolicySetupCatalogItemDto[] {
    if (!Array.isArray(raw)) {
        throw new Error(buildUnexpectedValueErrorMessage('policy-setup-history', 'catalog payload', 'an array', raw))
    }

    return raw.map((item, index) => readCatalogItem(item, `catalog[${index}]`))
}

export function parsePolicySetupLedgerResponse(raw: unknown): PolicySetupLedgerResponseDto {
    const record = asObject(raw, 'ledger')
    const daysRaw = record.days

    if (!Array.isArray(daysRaw)) {
        throw new Error(buildUnexpectedValueErrorMessage('policy-setup-history', 'ledger.days', 'an array', daysRaw))
    }

    return {
        setup: readCatalogItem(record.setup, 'ledger.setup'),
        availableRange: readDateRange(record.availableRange, 'ledger.availableRange'),
        appliedRange: readDateRange(record.appliedRange, 'ledger.appliedRange'),
        availableResolutions: readResolutionArray(record.availableResolutions, 'ledger.availableResolutions'),
        startCapitalUsd: readNumber(record.startCapitalUsd, 'ledger.startCapitalUsd'),
        balanceCeilingUsd: readNumber(record.balanceCeilingUsd, 'ledger.balanceCeilingUsd'),
        visibleBalanceCeilingUsd: readNumber(record.visibleBalanceCeilingUsd, 'ledger.visibleBalanceCeilingUsd'),
        capitalTimeline: readCapitalTimeline(record.capitalTimeline, 'ledger.capitalTimeline'),
        days: daysRaw.map((item, index) => readDay(item, `ledger.days[${index}]`))
    }
}

export function parsePolicySetupCandlesResponse(raw: unknown): PolicySetupCandlesResponseDto {
    const record = asObject(raw, 'candles')
    const candlesRaw = record.candles

    if (!Array.isArray(candlesRaw)) {
        throw new Error(
            buildUnexpectedValueErrorMessage('policy-setup-history', 'candles.candles', 'an array', candlesRaw)
        )
    }

    return {
        setupId: readString(record.setupId, 'candles.setupId'),
        availableRange: readDateRange(record.availableRange, 'candles.availableRange'),
        appliedRange: readCandleRange(record.appliedRange, 'candles.appliedRange'),
        candles: candlesRaw.map((item, index) => readCandle(item, `candles.candles[${index}]`))
    }
}

export async function fetchPolicySetupCatalog(): Promise<PolicySetupCatalogItemDto[]> {
    const raw = await fetchJson(
        `${API_BASE_URL}${policySetupCatalogPath}`,
        QUERY_POLICY_REGISTRY.policySetupHistory.catalog.timeoutMs
    )

    return parsePolicySetupCatalogResponse(raw)
}

export async function fetchPolicySetupHistoryStatus(): Promise<PolicySetupHistoryPublishedStatusDto> {
    const raw = await fetchJson(
        `${API_BASE_URL}${policySetupStatusPath}`,
        QUERY_POLICY_REGISTRY.policySetupHistory.status.timeoutMs
    )

    return parsePolicySetupHistoryPublishedStatusResponse(raw)
}

export async function triggerPolicySetupHistoryRebuild(): Promise<PolicySetupHistoryPublishedStatusDto> {
    const raw = await postJson(
        `${API_BASE_URL}${policySetupRebuildPath}`,
        QUERY_POLICY_REGISTRY.policySetupHistory.rebuild.timeoutMs
    )

    return parsePolicySetupHistoryPublishedStatusResponse(raw)
}

export async function fetchPolicySetupLedger(
    setupId: string,
    args?: PolicySetupWindowQueryArgs
): Promise<PolicySetupLedgerResponseDto> {
    const raw = await fetchJson(
        buildPolicySetupLedgerUrl(setupId, args),
        QUERY_POLICY_REGISTRY.policySetupHistory.ledger.timeoutMs
    )

    return parsePolicySetupLedgerResponse(raw)
}

export async function fetchPolicySetupCandles(
    setupId: string,
    args?: PolicySetupCandlesQueryArgs
): Promise<PolicySetupCandlesResponseDto> {
    const raw = await fetchJson(
        buildPolicySetupCandlesUrl(setupId, args),
        QUERY_POLICY_REGISTRY.policySetupHistory.candles.timeoutMs
    )

    return parsePolicySetupCandlesResponse(raw)
}

export async function prefetchPolicySetupCatalog(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: buildPolicySetupCatalogQueryKey(),
        queryFn: fetchPolicySetupCatalog,
        staleTime: QUERY_POLICY_REGISTRY.policySetupHistory.catalog.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.policySetupHistory.catalog.gcTimeMs
    })
}

export function usePolicySetupHistoryStatusQuery(
    enabled = true
): UseQueryResult<PolicySetupHistoryPublishedStatusDto, Error> {
    return useQuery({
        queryKey: buildPolicySetupHistoryStatusQueryKey(),
        queryFn: fetchPolicySetupHistoryStatus,
        enabled,
        staleTime: QUERY_POLICY_REGISTRY.policySetupHistory.status.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.policySetupHistory.status.gcTimeMs,
        refetchOnWindowFocus: false,
        refetchInterval: query =>
            query.state.data?.state === 'building' ?
                QUERY_POLICY_REGISTRY.policySetupHistory.status.refetchWhileBuildingIntervalMs
            :   false
    })
}

export function usePolicySetupCatalogQuery(enabled = true): UseQueryResult<PolicySetupCatalogItemDto[], Error> {
    return useQuery({
        queryKey: buildPolicySetupCatalogQueryKey(),
        queryFn: fetchPolicySetupCatalog,
        enabled,
        staleTime: QUERY_POLICY_REGISTRY.policySetupHistory.catalog.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.policySetupHistory.catalog.gcTimeMs
    })
}

export function usePolicySetupLedgerQuery(
    setupId: string | null | undefined,
    args?: PolicySetupWindowQueryArgs,
    enabled = true
): UseQueryResult<PolicySetupLedgerResponseDto, Error> {
    return useQuery({
        queryKey: buildPolicySetupLedgerQueryKey(setupId, args),
        queryFn: () => {
            if (!setupId) {
                throw new Error('[policy-setup-history] setupId is required for ledger query.')
            }

            return fetchPolicySetupLedger(setupId, args)
        },
        enabled: Boolean(setupId) && enabled,
        staleTime: QUERY_POLICY_REGISTRY.policySetupHistory.ledger.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.policySetupHistory.ledger.gcTimeMs,
        refetchOnWindowFocus: false
    })
}

export function usePolicySetupCandlesQuery(
    setupId: string | null | undefined,
    args?: PolicySetupCandlesQueryArgs,
    enabled = true
): UseQueryResult<PolicySetupCandlesResponseDto, Error> {
    return useQuery({
        queryKey: buildPolicySetupCandlesQueryKey(setupId, args),
        queryFn: () => {
            if (!setupId) {
                throw new Error('[policy-setup-history] setupId is required for candles query.')
            }

            return fetchPolicySetupCandles(setupId, args)
        },
        enabled: Boolean(setupId) && enabled,
        staleTime: QUERY_POLICY_REGISTRY.policySetupHistory.candles.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.policySetupHistory.candles.gcTimeMs,
        refetchOnWindowFocus: false
    })
}

export function usePolicySetupHistoryRebuildMutation(): UseMutationResult<
    PolicySetupHistoryPublishedStatusDto,
    Error,
    void
> {
    return useMutation({
        mutationFn: triggerPolicySetupHistoryRebuild
    })
}
