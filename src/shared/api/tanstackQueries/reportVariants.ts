import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import { QUERY_POLICY_REGISTRY } from '@/shared/configs/queryPolicies'
import { API_ROUTES } from '../routes'
import { fetchWithTimeout } from './utils/fetchWithTimeout'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

export const PUBLISHED_REPORT_VARIANT_FAMILIES = {
    policyBranchMega: 'policy_branch_mega',
    backtestDiagnostics: 'backtest_diagnostics',
    backtestExecutionPipeline: 'backtest_execution_pipeline',
    backtestConfidenceRisk: 'backtest_confidence_risk',
    backtestSharpMoveStats: 'backtest_sharp_move_stats',
    backtestBoundedParameterStats: 'backtest_bounded_parameter_stats',
    backtestModelStats: 'backtest_model_stats'
} as const

export type PublishedReportVariantFamily =
    (typeof PUBLISHED_REPORT_VARIANT_FAMILIES)[keyof typeof PUBLISHED_REPORT_VARIANT_FAMILIES]

export interface PublishedReportVariantOptionDto {
    value: string
    label: string
}

export interface PublishedReportVariantAxisDto {
    key: string
    defaultValue: string
    options: PublishedReportVariantOptionDto[]
}

export interface PublishedReportVariantEntryDto {
    key: string
    selection: Record<string, string>
    artifacts: Record<string, string>
}

export interface PublishedReportVariantCatalogDto {
    family: PublishedReportVariantFamily
    sourceReportKind: string
    sourceReportId: string
    publishedAtUtc: string
    axes: PublishedReportVariantAxisDto[]
    variants: PublishedReportVariantEntryDto[]
}

export interface PublishedReportVariantResolutionDto {
    family: PublishedReportVariantFamily
    selection: Record<string, string>
    variantKey: string
    variant: PublishedReportVariantEntryDto
}

interface UsePublishedReportVariantCatalogOptions {
    enabled?: boolean
}

const PUBLISHED_REPORT_VARIANT_CATALOG_QUERY_KEY_BASE = ['reports', 'variants', 'catalog'] as const
const PUBLISHED_REPORT_VARIANT_SELECTION_QUERY_KEY_BASE = ['reports', 'variants', 'selection'] as const
const { path } = API_ROUTES.reportVariants.catalogGet
const { path: selectionPath } = API_ROUTES.reportVariants.selectionGet

interface PublishedReportVariantAxesOwnerDto {
    family: PublishedReportVariantFamily
    axes: PublishedReportVariantAxisDto[]
}

export interface PublishedReportVariantSelectionSnapshotDto {
    family: PublishedReportVariantFamily
    sourceReportKind: string
    sourceReportId: string
    publishedAtUtc: string
    variantKey: string
    selection: Record<string, string>
    axes: PublishedReportVariantAxisDto[]
}

function toObject(raw: unknown, label: string): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[report-variants] ${label} must be an object.`)
    }

    return raw as Record<string, unknown>
}

function toRequiredString(raw: unknown, label: string): string {
    if (typeof raw !== 'string') {
        throw new Error(`[report-variants] ${label} must be a string.`)
    }

    const normalized = raw.trim()
    if (!normalized) {
        throw new Error(`[report-variants] ${label} must be non-empty.`)
    }

    return normalized
}

function toStringRecord(raw: unknown, label: string): Record<string, string> {
    const payload = toObject(raw, label)
    const result: Record<string, string> = {}

    Object.entries(payload).forEach(([key, value]) => {
        const normalizedKey = key.trim()
        if (!normalizedKey) {
            throw new Error(`[report-variants] ${label} contains empty key.`)
        }

        result[normalizedKey] = toRequiredString(value, `${label}.${normalizedKey}`)
    })

    return result
}

function mapPublishedReportVariantOption(raw: unknown, label: string): PublishedReportVariantOptionDto {
    const payload = toObject(raw, label)

    return {
        value: toRequiredString(payload.value, `${label}.value`),
        label: toRequiredString(payload.label, `${label}.label`)
    }
}

function mapPublishedReportVariantAxis(raw: unknown, label: string): PublishedReportVariantAxisDto {
    const payload = toObject(raw, label)

    return {
        key: toRequiredString(payload.key, `${label}.key`),
        defaultValue: toRequiredString(payload.defaultValue, `${label}.defaultValue`),
        options: Array.isArray(payload.options) ?
            payload.options.map((item, index) => mapPublishedReportVariantOption(item, `${label}.options[${index}]`))
        :   (() => {
                throw new Error(`[report-variants] ${label}.options must be an array.`)
            })()
    }
}

function mapPublishedReportVariantEntry(raw: unknown, label: string): PublishedReportVariantEntryDto {
    const payload = toObject(raw, label)

    return {
        key: toRequiredString(payload.key, `${label}.key`),
        selection: toStringRecord(payload.selection, `${label}.selection`),
        artifacts: toStringRecord(payload.artifacts, `${label}.artifacts`)
    }
}

function mapPublishedReportVariantCatalog(raw: unknown): PublishedReportVariantCatalogDto {
    const payload = toObject(raw, 'catalog')
    const family = toRequiredString(payload.family, 'catalog.family') as PublishedReportVariantFamily

    return {
        family,
        sourceReportKind: toRequiredString(payload.sourceReportKind, 'catalog.sourceReportKind'),
        sourceReportId: toRequiredString(payload.sourceReportId, 'catalog.sourceReportId'),
        publishedAtUtc: toRequiredString(payload.publishedAtUtc, 'catalog.publishedAtUtc'),
        axes: Array.isArray(payload.axes) ?
            payload.axes.map((item, index) => mapPublishedReportVariantAxis(item, `catalog.axes[${index}]`))
        :   (() => {
                throw new Error('[report-variants] catalog.axes must be an array.')
            })(),
        variants: Array.isArray(payload.variants) ?
            payload.variants.map((item, index) => mapPublishedReportVariantEntry(item, `catalog.variants[${index}]`))
        :   (() => {
                throw new Error('[report-variants] catalog.variants must be an array.')
            })()
    }
}

function mapPublishedReportVariantSelectionSnapshot(raw: unknown): PublishedReportVariantSelectionSnapshotDto {
    const payload = toObject(raw, 'selectionSnapshot')

    return {
        family: toRequiredString(payload.family, 'selectionSnapshot.family') as PublishedReportVariantFamily,
        sourceReportKind: toRequiredString(payload.sourceReportKind, 'selectionSnapshot.sourceReportKind'),
        sourceReportId: toRequiredString(payload.sourceReportId, 'selectionSnapshot.sourceReportId'),
        publishedAtUtc: toRequiredString(payload.publishedAtUtc, 'selectionSnapshot.publishedAtUtc'),
        variantKey: toRequiredString(payload.variantKey, 'selectionSnapshot.variantKey'),
        selection: toStringRecord(payload.selection, 'selectionSnapshot.selection'),
        axes: Array.isArray(payload.axes) ?
            payload.axes.map((item, index) => mapPublishedReportVariantAxis(item, `selectionSnapshot.axes[${index}]`))
        :   (() => {
                throw new Error('[report-variants] selectionSnapshot.axes must be an array.')
            })()
    }
}

function normalizeRequestedValue(raw: string | null | undefined): string | null {
    if (typeof raw !== 'string') {
        return null
    }

    const normalized = raw.trim()
    return normalized ? normalized : null
}

function getAxisOrThrow(source: PublishedReportVariantAxesOwnerDto, axisKey: string): PublishedReportVariantAxisDto {
    const axis = source.axes.find(item => item.key === axisKey)
    if (!axis) {
        throw new Error(`[report-variants] axis '${axisKey}' is missing in family '${source.family}'.`)
    }

    return axis
}

function getSelectionValue(entry: PublishedReportVariantEntryDto, axisKey: string): string {
    const value = entry.selection[axisKey]
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`[report-variants] variant '${entry.key}' is missing axis '${axisKey}'.`)
    }

    return value
}

export function buildPublishedReportVariantCatalogQueryKey(family: PublishedReportVariantFamily) {
    return [...PUBLISHED_REPORT_VARIANT_CATALOG_QUERY_KEY_BASE, family] as const
}

function buildPublishedReportVariantCatalogPath(family: PublishedReportVariantFamily): string {
    return `${path}/${encodeURIComponent(family)}`
}

function normalizeRequestedSelectionEntries(
    requestedSelection: Record<string, string | null | undefined>
): Array<[string, string]> {
    return Object.entries(requestedSelection)
        .map(([key, value]) => [key.trim(), normalizeRequestedValue(value)] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[0]) && Boolean(entry[1]))
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
}

export function buildPublishedReportVariantSelectionQueryKey(
    family: PublishedReportVariantFamily,
    requestedSelection: Record<string, string | null | undefined>
) {
    return [
        ...PUBLISHED_REPORT_VARIANT_SELECTION_QUERY_KEY_BASE,
        family,
        ...normalizeRequestedSelectionEntries(requestedSelection).flatMap(([key, value]) => [key, value])
    ] as const
}

function buildPublishedReportVariantSelectionPath(
    family: PublishedReportVariantFamily,
    requestedSelection: Record<string, string | null | undefined>
): string {
    const params = new URLSearchParams()
    normalizeRequestedSelectionEntries(requestedSelection).forEach(([key, value]) => {
        params.set(key, value)
    })

    const query = params.toString()
    const basePath = `${selectionPath}/${encodeURIComponent(family)}/selection`
    return query ? `${basePath}?${query}` : basePath
}

export async function fetchPublishedReportVariantCatalog(
    family: PublishedReportVariantFamily
): Promise<PublishedReportVariantCatalogDto> {
    const response = await fetchWithTimeout(`${API_BASE_URL}${buildPublishedReportVariantCatalogPath(family)}`, {
        timeoutMs: QUERY_POLICY_REGISTRY.reportVariants.catalog.timeoutMs
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load report variant catalog', response, text))
    }

    return mapPublishedReportVariantCatalog(await response.json())
}

export async function fetchPublishedReportVariantSelectionSnapshot(
    family: PublishedReportVariantFamily,
    requestedSelection: Record<string, string | null | undefined>
): Promise<PublishedReportVariantSelectionSnapshotDto> {
    const response = await fetchWithTimeout(
        `${API_BASE_URL}${buildPublishedReportVariantSelectionPath(family, requestedSelection)}`,
        {
            timeoutMs: QUERY_POLICY_REGISTRY.reportVariants.selection.timeoutMs
        }
    )

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load report variant selection snapshot', response, text))
    }

    return mapPublishedReportVariantSelectionSnapshot(await response.json())
}

export function usePublishedReportVariantCatalogQuery(
    family: PublishedReportVariantFamily,
    options?: UsePublishedReportVariantCatalogOptions
): UseQueryResult<PublishedReportVariantCatalogDto, Error> {
    return useQuery({
        queryKey: buildPublishedReportVariantCatalogQueryKey(family),
        queryFn: () => fetchPublishedReportVariantCatalog(family),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.reportVariants.catalog.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.reportVariants.catalog.gcTimeMs,
        refetchOnWindowFocus: false
    })
}

export function usePublishedReportVariantSelectionQuery(
    family: PublishedReportVariantFamily,
    requestedSelection: Record<string, string | null | undefined>,
    options?: UsePublishedReportVariantCatalogOptions
): UseQueryResult<PublishedReportVariantSelectionSnapshotDto, Error> {
    return useQuery({
        queryKey: buildPublishedReportVariantSelectionQueryKey(family, requestedSelection),
        queryFn: () => fetchPublishedReportVariantSelectionSnapshot(family, requestedSelection),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.reportVariants.selection.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.reportVariants.selection.gcTimeMs,
        refetchOnWindowFocus: false
    })
}

export async function prefetchPublishedReportVariantCatalog(
    queryClient: QueryClient,
    family: PublishedReportVariantFamily
): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: buildPublishedReportVariantCatalogQueryKey(family),
        queryFn: () => fetchPublishedReportVariantCatalog(family),
        staleTime: QUERY_POLICY_REGISTRY.reportVariants.catalog.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.reportVariants.catalog.gcTimeMs
    })
}

export async function prefetchPublishedReportVariantSelectionSnapshot(
    queryClient: QueryClient,
    family: PublishedReportVariantFamily,
    requestedSelection: Record<string, string | null | undefined>
): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: buildPublishedReportVariantSelectionQueryKey(family, requestedSelection),
        queryFn: () => fetchPublishedReportVariantSelectionSnapshot(family, requestedSelection),
        staleTime: QUERY_POLICY_REGISTRY.reportVariants.selection.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.reportVariants.selection.gcTimeMs
    })
}

export function resolvePublishedReportVariantSelection(
    catalog: PublishedReportVariantCatalogDto,
    requestedSelection: Record<string, string | null | undefined>
): PublishedReportVariantResolutionDto {
    let candidates = [...catalog.variants]
    if (candidates.length === 0) {
        throw new Error(`[report-variants] family '${catalog.family}' has no published variants.`)
    }

    const resolvedSelection: Record<string, string> = {}

    for (const axis of catalog.axes) {
        const compatibleOptions = axis.options.filter(option =>
            candidates.some(candidate => getSelectionValue(candidate, axis.key) === option.value)
        )

        if (compatibleOptions.length === 0) {
            throw new Error(
                `[report-variants] axis '${axis.key}' has no compatible values in family '${catalog.family}'.`
            )
        }

        const requestedValue = normalizeRequestedValue(requestedSelection[axis.key])
        let resolvedValue: string
        if (requestedValue) {
            if (!compatibleOptions.some(option => option.value === requestedValue)) {
                throw new Error(
                    `[report-variants] query value '${requestedValue}' is unsupported for axis '${axis.key}' in family '${catalog.family}'.`
                )
            }

            resolvedValue = requestedValue
        } else {
            resolvedValue =
                compatibleOptions.some(option => option.value === axis.defaultValue) ?
                    axis.defaultValue
                :   compatibleOptions[0].value
        }

        resolvedSelection[axis.key] = resolvedValue
        candidates = candidates.filter(candidate => getSelectionValue(candidate, axis.key) === resolvedValue)
    }

    if (candidates.length !== 1) {
        throw new Error(
            `[report-variants] resolved selection is ambiguous in family '${catalog.family}'. matches=${candidates.length}.`
        )
    }

    return {
        family: catalog.family,
        selection: resolvedSelection,
        variantKey: candidates[0].key,
        variant: candidates[0]
    }
}

export function buildPublishedReportVariantCompatibleOptions(
    catalog: PublishedReportVariantCatalogDto,
    resolvedSelection: Record<string, string>,
    axisKey: string
): PublishedReportVariantOptionDto[] {
    const axis = getAxisOrThrow(catalog, axisKey)

    return axis.options.filter(option =>
        catalog.variants.some(variant => {
            if (getSelectionValue(variant, axisKey) !== option.value) {
                return false
            }

            return catalog.axes.every(otherAxis => {
                if (otherAxis.key === axisKey) {
                    return true
                }

                return getSelectionValue(variant, otherAxis.key) === resolvedSelection[otherAxis.key]
            })
        })
    )
}

export function getPublishedReportVariantAxisOptionValues(
    source: PublishedReportVariantAxesOwnerDto,
    axisKey: string
): string[] {
    return getAxisOrThrow(source, axisKey).options.map(option => option.value)
}

export function hasPublishedReportVariantAxis(
    catalog: PublishedReportVariantCatalogDto | null | undefined,
    axisKey: string
): boolean {
    if (!catalog) {
        return false
    }

    return catalog.axes.some(axis => axis.key === axisKey)
}

export function getPublishedReportVariantAxisDefaultValue(
    catalog: PublishedReportVariantCatalogDto,
    axisKey: string
): string {
    return getAxisOrThrow(catalog, axisKey).defaultValue
}
