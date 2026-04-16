export const MODE_IDS = ['tbm_native', 'directional_walkforward', 'directional_fixed_split'] as const
export const WALK_FORWARD_MODE_IDS = ['tbm_native', 'directional_walkforward'] as const
export const WALK_FORWARD_REPORT_SLICE_IDS = ['overall', 'fresh_only', 'stale_only', 'full_fit_replay'] as const
export const FIXED_SPLIT_REPORT_SLICE_IDS = ['train', 'full', 'oos'] as const
export const REPORT_SLICE_IDS = [...WALK_FORWARD_REPORT_SLICE_IDS, ...FIXED_SPLIT_REPORT_SLICE_IDS] as const

export const MODE_SURFACE_KEYS = [
    'current_snapshot',
    'money',
    'history',
    'model_stats',
    'aggregation',
    'pfi_per_model',
    'pfi_sl_model'
] as const

export const MODE_PAGE_KEYS = [
    'current_prediction',
    'prediction_history',
    'current_prediction_oos_presets',
    'model_stats',
    'aggregation_stats',
    'pfi_per_model',
    'pfi_sl_model',
    'pfi_feature_detail',
    'policy_branch_mega',
    'policy_setups',
    'confidence_risk',
    'sharp_move_stats',
    'bounded_parameter_stats',
    'execution_pipeline',
    'real_forecast_journal',
    'diagnostics_backtest',
    'diagnostics_guardrail',
    'diagnostics_decisions',
    'diagnostics_hotspots',
    'diagnostics_other',
    'diagnostics_ratings',
    'diagnostics_day_stats'
] as const

export const MODE_PAGE_BINDING_KINDS = ['fixed_split_page', 'walk_forward_surface_stack'] as const

export type ModeId = (typeof MODE_IDS)[number]
export type WalkForwardModeId = (typeof WALK_FORWARD_MODE_IDS)[number]
export type WalkForwardReportSliceId = (typeof WALK_FORWARD_REPORT_SLICE_IDS)[number]
export type FixedSplitReportSliceId = (typeof FIXED_SPLIT_REPORT_SLICE_IDS)[number]
export type ReportSliceId = (typeof REPORT_SLICE_IDS)[number]
export type ModeSurfaceKey = (typeof MODE_SURFACE_KEYS)[number]
export type ModePageKey = (typeof MODE_PAGE_KEYS)[number]
export type ModePageBindingKind = (typeof MODE_PAGE_BINDING_KINDS)[number]
export type ReportSliceForMode<TMode extends ModeId> =
    TMode extends WalkForwardModeId ? WalkForwardReportSliceId : FixedSplitReportSliceId
export type SurfaceKeysForMode<TMode extends ModeId> = TMode extends WalkForwardModeId ? ModeSurfaceKey : never

export interface ModeRegistrySliceDescriptor<
    TMode extends ModeId = ModeId,
    TSlice extends ReportSliceForMode<TMode> = ReportSliceForMode<TMode>
> {
    modeId: TMode
    key: TSlice
    displayLabel: string
    isDiagnostic: boolean
    comparability: string
    description: string
}

export interface ModeRegistrySurfaceDescriptor<
    TMode extends ModeId = ModeId,
    TSurfaceKey extends SurfaceKeysForMode<TMode> = SurfaceKeysForMode<TMode>
> {
    modeId: TMode
    key: TSurfaceKey
    displayName: string
    queryNamespace: readonly string[]
}

export interface ModeRegistryModeDescriptor<TMode extends ModeId = ModeId> {
    id: TMode
    displayName: string
    isDefault: boolean
    defaultSliceKey: ReportSliceForMode<TMode>
    slices: readonly ModeRegistrySliceDescriptor<TMode, ReportSliceForMode<TMode>>[]
    surfaces: readonly ModeRegistrySurfaceDescriptor<TMode, SurfaceKeysForMode<TMode>>[]
}

export interface ModeRegistryPageBindingDescriptor<TMode extends ModeId = ModeId> {
    pageKey: ModePageKey
    modeId: TMode
    bindingKind: TMode extends WalkForwardModeId ? ModePageBindingKind : Extract<ModePageBindingKind, 'fixed_split_page'>
    queryNamespace: readonly string[]
    publishedReportFamilyKey: string | null
    surfaceKeys: readonly SurfaceKeysForMode<TMode>[]
}

export type ModePageBindingDescriptor<TMode extends ModeId = ModeId> = ModeRegistryPageBindingDescriptor<TMode>

export interface ModeRegistryPageDescriptor {
    key: ModePageKey
    displayName: string
    bindings: readonly ModeRegistryPageBindingDescriptor[]
}

export interface ModeRegistryDto {
    schemaVersion: string
    modes: readonly ModeRegistryModeDescriptor[]
    pages: readonly ModeRegistryPageDescriptor[]
}

// Bootstrap default before /api/modes finishes loading. Labels and route support still come from the backend owner registry.
export const DEFAULT_MODE: ModeId = 'tbm_native'

const MODE_REPORT_SLICE_KEYS = {
    tbm_native: WALK_FORWARD_REPORT_SLICE_IDS,
    directional_walkforward: WALK_FORWARD_REPORT_SLICE_IDS,
    directional_fixed_split: FIXED_SPLIT_REPORT_SLICE_IDS
} as const satisfies Record<ModeId, readonly ReportSliceId[]>

export function isModeId(value: string): value is ModeId {
    return (MODE_IDS as readonly string[]).includes(value)
}

export function isWalkForwardModeId(modeId: ModeId): modeId is WalkForwardModeId {
    return (WALK_FORWARD_MODE_IDS as readonly string[]).includes(modeId)
}

export function isReportSliceId(value: string): value is ReportSliceId {
    return (REPORT_SLICE_IDS as readonly string[]).includes(value)
}

export function isModeSurfaceKey(value: string): value is ModeSurfaceKey {
    return (MODE_SURFACE_KEYS as readonly string[]).includes(value)
}

export function isModePageKey(value: string): value is ModePageKey {
    return (MODE_PAGE_KEYS as readonly string[]).includes(value)
}

export function isModePageBindingKind(value: string): value is ModePageBindingKind {
    return (MODE_PAGE_BINDING_KINDS as readonly string[]).includes(value)
}

export function isModeReportSlice<TMode extends ModeId>(
    modeId: TMode,
    sliceKey: string
): sliceKey is ReportSliceForMode<TMode> {
    return (MODE_REPORT_SLICE_KEYS[modeId] as readonly string[]).includes(sliceKey)
}

export function isModeSurfaceForMode<TMode extends ModeId>(
    modeId: TMode,
    surfaceKey: string
): surfaceKey is SurfaceKeysForMode<TMode> {
    if (!isWalkForwardModeId(modeId)) {
        return false
    }

    return isModeSurfaceKey(surfaceKey)
}

export function getModeRegistryMode<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    modeId: TMode
): ModeRegistryModeDescriptor<TMode> {
    const descriptor = catalog.modes.find(mode => mode.id === modeId)
    if (!descriptor) {
        throw new Error(`[mode] mode descriptor is missing in the owner registry. modeId=${modeId}.`)
    }

    return descriptor as ModeRegistryModeDescriptor<TMode>
}

export function tryGetModeRegistryMode<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    modeId: TMode
): ModeRegistryModeDescriptor<TMode> | null {
    const descriptor = catalog.modes.find(mode => mode.id === modeId)
    return descriptor ? (descriptor as ModeRegistryModeDescriptor<TMode>) : null
}

export function getModeReportSlices<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    modeId: TMode
): readonly ModeRegistrySliceDescriptor<TMode, ReportSliceForMode<TMode>>[] {
    return getModeRegistryMode(catalog, modeId).slices
}

export function getDefaultModeReportSlice<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    modeId: TMode
): ReportSliceForMode<TMode> {
    return getModeRegistryMode(catalog, modeId).defaultSliceKey
}

export function getModeReportSliceDescriptor<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    modeId: TMode,
    sliceKey: ReportSliceForMode<TMode>
): ModeRegistrySliceDescriptor<TMode, ReportSliceForMode<TMode>> {
    const descriptor = getModeReportSlices(catalog, modeId).find(slice => slice.key === sliceKey)
    if (!descriptor) {
        throw new Error(`[mode] report slice descriptor is missing in the owner registry. modeId=${modeId}; sliceKey=${sliceKey}.`)
    }

    return descriptor
}

export function tryGetModeReportSliceDescriptor<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    modeId: TMode,
    sliceKey: string
): ModeRegistrySliceDescriptor<TMode, ReportSliceForMode<TMode>> | null {
    if (!isModeReportSlice(modeId, sliceKey)) {
        return null
    }

    return (
        getModeReportSlices(catalog, modeId).find(slice => slice.key === sliceKey) ??
        null
    ) as ModeRegistrySliceDescriptor<TMode, ReportSliceForMode<TMode>> | null
}

export function getModeSurfaces<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    modeId: TMode
): readonly ModeRegistrySurfaceDescriptor<TMode, SurfaceKeysForMode<TMode>>[] {
    return getModeRegistryMode(catalog, modeId).surfaces
}

export function getModeSurfaceDescriptor<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    modeId: TMode,
    surfaceKey: SurfaceKeysForMode<TMode>
): ModeRegistrySurfaceDescriptor<TMode, SurfaceKeysForMode<TMode>> {
    const descriptor = getModeSurfaces(catalog, modeId).find(surface => surface.key === surfaceKey)
    if (!descriptor) {
        throw new Error(`[mode] surface descriptor is missing in the owner registry. modeId=${modeId}; surfaceKey=${surfaceKey}.`)
    }

    return descriptor as ModeRegistrySurfaceDescriptor<TMode, SurfaceKeysForMode<TMode>>
}

export function getModePageDescriptor(catalog: ModeRegistryDto, pageKey: ModePageKey): ModeRegistryPageDescriptor {
    const descriptor = catalog.pages.find(page => page.key === pageKey)
    if (!descriptor) {
        throw new Error(`[mode] page descriptor is missing in the owner registry. pageKey=${pageKey}.`)
    }

    return descriptor
}

export function getModePageBindingDescriptor<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    pageKey: ModePageKey,
    modeId: TMode
): ModeRegistryPageBindingDescriptor<TMode> {
    const page = getModePageDescriptor(catalog, pageKey)
    const binding = page.bindings.find(candidate => candidate.modeId === modeId)
    if (!binding) {
        throw new Error(`[mode] page binding is missing in the owner registry. pageKey=${pageKey}; modeId=${modeId}.`)
    }

    return binding as ModeRegistryPageBindingDescriptor<TMode>
}

export function tryGetModePageBindingDescriptor<TMode extends ModeId>(
    catalog: ModeRegistryDto,
    pageKey: ModePageKey,
    modeId: TMode
): ModeRegistryPageBindingDescriptor<TMode> | null {
    const page = catalog.pages.find(candidate => candidate.key === pageKey)
    if (!page) {
        return null
    }

    return (
        page.bindings.find(candidate => candidate.modeId === modeId) ?? null
    ) as ModeRegistryPageBindingDescriptor<TMode> | null
}

export function supportsModePage(catalog: ModeRegistryDto, pageKey: ModePageKey, modeId: ModeId): boolean {
    return Boolean(tryGetModePageBindingDescriptor(catalog, pageKey, modeId))
}
