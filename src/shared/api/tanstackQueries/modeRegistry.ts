import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import { QUERY_POLICY_REGISTRY } from '@/shared/configs/queryPolicies'
import { API_ROUTES } from '../routes'
import { fetchWithTimeout } from './utils/fetchWithTimeout'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'
import {
    isModeId,
    isModePageBindingKind,
    isModePageKey,
    isModeReportSlice,
    isModeSurfaceForMode,
    isWalkForwardModeId,
    type ModeId,
    type ModePageBindingDescriptor,
    type ModePageBindingKind,
    type ModePageKey,
    type ModeRegistryDto,
    type ModeRegistryModeDescriptor,
    type ModeRegistryPageBindingDescriptor,
    type ModeRegistryPageDescriptor,
    type ModeRegistrySliceDescriptor,
    type ModeRegistrySurfaceDescriptor
} from '@/entities/mode'

const MODE_REGISTRY_SCHEMA_VERSION = 'mode-registry-v2-2026-04-16'
const MODE_REGISTRY_QUERY_KEY = ['modes', 'registry'] as const
const { path } = API_ROUTES.modes.registry

interface UseModeRegistryQueryOptions {
    enabled?: boolean
}

function toObject(raw: unknown, label: string): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`[mode-registry] ${label} must be an object.`)
    }

    return raw as Record<string, unknown>
}

function toRequiredString(raw: unknown, label: string): string {
    if (typeof raw !== 'string') {
        throw new Error(`[mode-registry] ${label} must be a string.`)
    }

    const normalized = raw.trim()
    if (!normalized) {
        throw new Error(`[mode-registry] ${label} must be non-empty.`)
    }

    return normalized
}

function toRequiredBoolean(raw: unknown, label: string): boolean {
    if (typeof raw !== 'boolean') {
        throw new Error(`[mode-registry] ${label} must be a boolean.`)
    }

    return raw
}

function toStringArray(raw: unknown, label: string): string[] {
    if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error(`[mode-registry] ${label} must be a non-empty array.`)
    }

    return raw.map((value, index) => toRequiredString(value, `${label}[${index}]`))
}

function toOptionalString(raw: unknown, label: string): string | null {
    if (raw === null || raw === undefined) {
        return null
    }

    return toRequiredString(raw, label)
}

function requireSchemaVersion(raw: unknown): string {
    const value = toRequiredString(raw, 'modeRegistry.schemaVersion')
    if (value !== MODE_REGISTRY_SCHEMA_VERSION) {
        throw new Error(
            `[mode-registry] schema version mismatch. expected=${MODE_REGISTRY_SCHEMA_VERSION}; actual=${value}; requiredAction=rebuild backend mode registry artifacts and align the frontend parser intentionally.`
        )
    }

    return value
}

function requireModeId(raw: unknown, label: string): ModeId {
    const value = toRequiredString(raw, label)
    if (!isModeId(value)) {
        throw new Error(
            `[mode-registry] ${label} has unsupported mode id. expected=known mode id; actual=${value}; requiredAction=align backend /api/modes payload with the canonical mode ids.`
        )
    }

    return value
}

function requirePageKey(raw: unknown, label: string): ModePageKey {
    const value = toRequiredString(raw, label)
    if (!isModePageKey(value)) {
        throw new Error(
            `[mode-registry] ${label} has unsupported page key. expected=known page key; actual=${value}; requiredAction=align backend /api/modes payload with canonical route page keys.`
        )
    }

    return value
}

function requireBindingKind(raw: unknown, label: string): ModePageBindingKind {
    const value = toRequiredString(raw, label)
    if (!isModePageBindingKind(value)) {
        throw new Error(
            `[mode-registry] ${label} has unsupported binding kind. expected=known binding kind; actual=${value}; requiredAction=align backend /api/modes payload with canonical route binding kinds.`
        )
    }

    return value
}

function mapModeRegistrySlice(
    raw: unknown,
    modeId: ModeId,
    label: string
): ModeRegistrySliceDescriptor {
    const payload = toObject(raw, label)
    const key = toRequiredString(payload.key, `${label}.key`)
    if (!isModeReportSlice(modeId, key)) {
        throw new Error(
            `[mode-registry] ${label}.key has unsupported slice id for mode. expected=known slice id for mode=${modeId}; actual=${key}; requiredAction=align backend /api/modes payload with the canonical slice ids for the mode.`
        )
    }

    return {
        modeId,
        key,
        displayLabel: toRequiredString(payload.displayLabel, `${label}.displayLabel`),
        isDiagnostic: toRequiredBoolean(payload.isDiagnostic, `${label}.isDiagnostic`),
        comparability: toRequiredString(payload.comparability, `${label}.comparability`),
        description: toRequiredString(payload.description, `${label}.description`)
    }
}

function mapModeRegistrySurface(
    raw: unknown,
    modeId: ModeId,
    label: string
): ModeRegistrySurfaceDescriptor | null {
    if (!isWalkForwardModeId(modeId)) {
        throw new Error(
            `[mode-registry] ${label} cannot exist for non-walk-forward mode. modeId=${modeId}; requiredAction=publish surfaces only for walk-forward modes.`
        )
    }

    const payload = toObject(raw, label)
    const key = toRequiredString(payload.key, `${label}.key`)
    if (!isModeSurfaceForMode(modeId, key)) {
        throw new Error(
            `[mode-registry] ${label}.key has unsupported surface id for mode. modeId=${modeId}; actual=${key}; requiredAction=align backend /api/modes payload with canonical surface ids.`
        )
    }

    return {
        modeId,
        key,
        displayName: toRequiredString(payload.displayName, `${label}.displayName`),
        queryNamespace: toStringArray(payload.queryNamespace, `${label}.queryNamespace`)
    }
}

function mapModeRegistryMode(raw: unknown, label: string): ModeRegistryModeDescriptor {
    const payload = toObject(raw, label)
    const id = requireModeId(payload.id, `${label}.id`)
    const slicesRaw = payload.slices
    if (!Array.isArray(slicesRaw) || slicesRaw.length === 0) {
        throw new Error(
            `[mode-registry] ${label}.slices must be a non-empty array. requiredAction=publish the full slice set for every mode.`
        )
    }

    const slices = slicesRaw.map((slice, index) => mapModeRegistrySlice(slice, id, `${label}.slices[${index}]`))
    const seenSliceKeys = new Set<string>()
    slices.forEach(slice => {
        if (seenSliceKeys.has(slice.key)) {
            throw new Error(
                `[mode-registry] ${label}.slices contains duplicate key. modeId=${id}; sliceKey=${slice.key}; requiredAction=publish each slice once in the owner catalog.`
            )
        }

        seenSliceKeys.add(slice.key)
    })

    const defaultSliceKey = toRequiredString(payload.defaultSliceKey, `${label}.defaultSliceKey`)
    if (!isModeReportSlice(id, defaultSliceKey)) {
        throw new Error(
            `[mode-registry] ${label}.defaultSliceKey has unsupported slice id for mode. modeId=${id}; defaultSliceKey=${defaultSliceKey}; requiredAction=align backend /api/modes payload with the canonical slice ids for the mode.`
        )
    }

    if (!slices.some(slice => slice.key === defaultSliceKey)) {
        throw new Error(
            `[mode-registry] ${label}.defaultSliceKey is missing from slices. modeId=${id}; defaultSliceKey=${defaultSliceKey}; requiredAction=publish a default slice that exists in the owner catalog.`
        )
    }

    const surfacesRaw = payload.surfaces
    if (!Array.isArray(surfacesRaw)) {
        throw new Error(`[mode-registry] ${label}.surfaces must be an array.`)
    }

    const surfaces = surfacesRaw.map((surface, index) => mapModeRegistrySurface(surface, id, `${label}.surfaces[${index}]`))
    const seenSurfaceKeys = new Set<string>()
    surfaces.forEach(surface => {
        if (!surface) {
            return
        }

        if (seenSurfaceKeys.has(surface.key)) {
            throw new Error(
                `[mode-registry] ${label}.surfaces contains duplicate key. modeId=${id}; surfaceKey=${surface.key}; requiredAction=publish each surface once in the owner catalog.`
            )
        }

        seenSurfaceKeys.add(surface.key)
    })

    if (!isWalkForwardModeId(id) && surfaces.length > 0) {
        throw new Error(
            `[mode-registry] ${label}.surfaces must be empty for fixed-split mode. modeId=${id}; requiredAction=remove walk-forward surfaces from fixed-split mode.`
        )
    }

    return {
        id,
        displayName: toRequiredString(payload.displayName, `${label}.displayName`),
        isDefault: toRequiredBoolean(payload.isDefault, `${label}.isDefault`),
        defaultSliceKey,
        slices,
        surfaces: surfaces.filter(Boolean) as ModeRegistrySurfaceDescriptor[]
    }
}

function mapModeRegistryPageBinding(
    raw: unknown,
    pageKey: ModePageKey,
    modes: readonly ModeRegistryModeDescriptor[],
    label: string
): ModeRegistryPageBindingDescriptor {
    const payload = toObject(raw, label)
    const modeId = requireModeId(payload.modeId, `${label}.modeId`)
    const bindingKind = requireBindingKind(payload.bindingKind, `${label}.bindingKind`)
    const queryNamespace = toStringArray(payload.queryNamespace, `${label}.queryNamespace`)
    const publishedReportFamilyKey = toOptionalString(payload.publishedReportFamilyKey, `${label}.publishedReportFamilyKey`)
    const surfaceKeys = Array.isArray(payload.surfaceKeys) ?
        payload.surfaceKeys.map((surfaceKey, index) => toRequiredString(surfaceKey, `${label}.surfaceKeys[${index}]`))
    :   (() => {
            throw new Error(`[mode-registry] ${label}.surfaceKeys must be an array.`)
        })()

    const mode = modes.find(candidate => candidate.id === modeId)
    if (!mode) {
        throw new Error(
            `[mode-registry] ${label}.modeId does not exist in modes catalog. modeId=${modeId}; requiredAction=publish bindings only for known modes.`
        )
    }

    if (bindingKind === 'fixed_split_page') {
        if (modeId !== 'directional_fixed_split') {
            throw new Error(
                `[mode-registry] ${label} fixed-split binding uses unsupported mode. actual=${modeId}; requiredAction=reserve fixed_split_page bindings for directional_fixed_split only.`
            )
        }

        if (surfaceKeys.length > 0) {
            throw new Error(
                `[mode-registry] ${label} fixed-split binding must not expose surfaces. pageKey=${pageKey}; modeId=${modeId}.`
            )
        }
    }

    if (bindingKind === 'walk_forward_surface_stack') {
        if (!isWalkForwardModeId(modeId)) {
            throw new Error(
                `[mode-registry] ${label} walk-forward binding uses non-walk-forward mode. actual=${modeId}; requiredAction=reserve walk_forward_surface_stack bindings for walk-forward modes only.`
            )
        }

        if (surfaceKeys.length === 0) {
            throw new Error(
                `[mode-registry] ${label} walk-forward binding must publish at least one surface. pageKey=${pageKey}; modeId=${modeId}.`
            )
        }

        surfaceKeys.forEach(surfaceKey => {
            if (!isModeSurfaceForMode(modeId, surfaceKey)) {
                throw new Error(
                    `[mode-registry] ${label}.surfaceKeys contains unsupported surface for mode. pageKey=${pageKey}; modeId=${modeId}; surfaceKey=${surfaceKey}.`
                )
            }

            if (!mode.surfaces.some(surface => surface.key === surfaceKey)) {
                throw new Error(
                    `[mode-registry] ${label}.surfaceKeys references a surface that is missing from mode.surfaces. pageKey=${pageKey}; modeId=${modeId}; surfaceKey=${surfaceKey}.`
                )
            }
        })
    }

    return {
        pageKey,
        modeId,
        bindingKind,
        queryNamespace,
        publishedReportFamilyKey,
        surfaceKeys
    } as ModePageBindingDescriptor
}

function mapModeRegistryPage(
    raw: unknown,
    modes: readonly ModeRegistryModeDescriptor[],
    label: string
): ModeRegistryPageDescriptor {
    const payload = toObject(raw, label)
    const key = requirePageKey(payload.key, `${label}.key`)
    const bindingsRaw = payload.bindings
    if (!Array.isArray(bindingsRaw) || bindingsRaw.length === 0) {
        throw new Error(
            `[mode-registry] ${label}.bindings must be a non-empty array. requiredAction=publish route bindings for every declared page.`
        )
    }

    const bindings = bindingsRaw.map((binding, index) =>
        mapModeRegistryPageBinding(binding, key, modes, `${label}.bindings[${index}]`)
    )
    const seenModeIds = new Set<string>()
    bindings.forEach(binding => {
        if (seenModeIds.has(binding.modeId)) {
            throw new Error(
                `[mode-registry] ${label}.bindings contains duplicate mode binding. pageKey=${key}; modeId=${binding.modeId}; requiredAction=publish at most one binding per mode per page.`
            )
        }

        seenModeIds.add(binding.modeId)
    })

    return {
        key,
        displayName: toRequiredString(payload.displayName, `${label}.displayName`),
        bindings
    }
}

function mapModeRegistry(raw: unknown): ModeRegistryDto {
    const payload = toObject(raw, 'modeRegistry')
    const modesRaw = payload.modes
    if (!Array.isArray(modesRaw) || modesRaw.length === 0) {
        throw new Error(
            '[mode-registry] modeRegistry.modes must be a non-empty array. requiredAction=publish the full mode catalog from backend owner contracts.'
        )
    }

    const modes = modesRaw.map((mode, index) => mapModeRegistryMode(mode, `modeRegistry.modes[${index}]`))
    const seenModeIds = new Set<string>()
    let defaultModeCount = 0
    modes.forEach(mode => {
        if (seenModeIds.has(mode.id)) {
            throw new Error(
                `[mode-registry] modeRegistry.modes contains duplicate mode id. modeId=${mode.id}; requiredAction=publish each mode once in the owner catalog.`
            )
        }

        seenModeIds.add(mode.id)
        if (mode.isDefault) {
            defaultModeCount += 1
        }
    })

    if (defaultModeCount !== 1) {
        throw new Error(
            `[mode-registry] modeRegistry.modes must contain exactly one default mode. actual=${defaultModeCount}; requiredAction=publish one canonical default mode in the owner catalog.`
        )
    }

    const pagesRaw = payload.pages
    if (!Array.isArray(pagesRaw) || pagesRaw.length === 0) {
        throw new Error(
            '[mode-registry] modeRegistry.pages must be a non-empty array. requiredAction=publish the full page binding catalog from backend owner contracts.'
        )
    }

    const pages = pagesRaw.map((page, index) => mapModeRegistryPage(page, modes, `modeRegistry.pages[${index}]`))
    const seenPageKeys = new Set<string>()
    pages.forEach(page => {
        if (seenPageKeys.has(page.key)) {
            throw new Error(
                `[mode-registry] modeRegistry.pages contains duplicate page key. pageKey=${page.key}; requiredAction=publish each page once in the owner catalog.`
            )
        }

        seenPageKeys.add(page.key)
    })

    return {
        schemaVersion: requireSchemaVersion(payload.schemaVersion),
        modes,
        pages
    }
}

export async function fetchModeRegistry(): Promise<ModeRegistryDto> {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
        timeoutMs: QUERY_POLICY_REGISTRY.modeRegistry.timeoutMs
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load mode registry', response, text))
    }

    return mapModeRegistry(await response.json())
}

export function useModeRegistryQuery(options?: UseModeRegistryQueryOptions): UseQueryResult<ModeRegistryDto, Error> {
    return useQuery({
        queryKey: MODE_REGISTRY_QUERY_KEY,
        queryFn: fetchModeRegistry,
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.modeRegistry.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.modeRegistry.gcTimeMs,
        refetchOnWindowFocus: false
    })
}
