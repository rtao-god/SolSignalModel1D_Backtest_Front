export type ModeId = 'tbm_native' | 'directional_walkforward' | 'directional_fixed_split'
export type WalkForwardModeId = Extract<ModeId, 'tbm_native' | 'directional_walkforward'>
export type WalkForwardReportSliceId = 'overall' | 'fresh_only' | 'stale_only' | 'full_fit_replay'
export type FixedSplitReportSliceId = 'train' | 'full' | 'oos'
export type ReportSliceId = WalkForwardReportSliceId | FixedSplitReportSliceId

export interface ReportSliceDescriptor<TMode extends ModeId = ModeId, TSlice extends ReportSliceId = ReportSliceId> {
    modeId: TMode
    key: TSlice
    label: string
}

export interface ModeDescriptor {
    id: ModeId
    displayName: string
    isDefault: boolean
}

export const ALL_MODES: ModeDescriptor[] = [
    { id: 'tbm_native', displayName: 'TBM Native', isDefault: true },
    { id: 'directional_walkforward', displayName: 'Directional Walk-Forward', isDefault: false },
    { id: 'directional_fixed_split', displayName: 'Directional Fixed-Split', isDefault: false },
]

export const DEFAULT_MODE: ModeId = 'tbm_native'

export const WALK_FORWARD_REPORT_SLICES: ReadonlyArray<ReportSliceDescriptor<WalkForwardModeId, WalkForwardReportSliceId>> = [
    { modeId: 'tbm_native', key: 'overall', label: 'Overall' },
    { modeId: 'tbm_native', key: 'fresh_only', label: 'Fresh only' },
    { modeId: 'tbm_native', key: 'stale_only', label: 'Stale only' },
    { modeId: 'tbm_native', key: 'full_fit_replay', label: 'Full-fit replay' },
    { modeId: 'directional_walkforward', key: 'overall', label: 'Overall' },
    { modeId: 'directional_walkforward', key: 'fresh_only', label: 'Fresh only' },
    { modeId: 'directional_walkforward', key: 'stale_only', label: 'Stale only' },
    { modeId: 'directional_walkforward', key: 'full_fit_replay', label: 'Full-fit replay' },
]

export const FIXED_SPLIT_REPORT_SLICES: ReadonlyArray<ReportSliceDescriptor<'directional_fixed_split', FixedSplitReportSliceId>> = [
    { modeId: 'directional_fixed_split', key: 'train', label: 'Train' },
    { modeId: 'directional_fixed_split', key: 'full', label: 'Full' },
    { modeId: 'directional_fixed_split', key: 'oos', label: 'OOS' },
]

export const MODE_REPORT_SLICE_CATALOG = {
    tbm_native: WALK_FORWARD_REPORT_SLICES.filter(slice => slice.modeId === 'tbm_native'),
    directional_walkforward: WALK_FORWARD_REPORT_SLICES.filter(slice => slice.modeId === 'directional_walkforward'),
    directional_fixed_split: FIXED_SPLIT_REPORT_SLICES
} as const satisfies Record<ModeId, readonly ReportSliceDescriptor[]>

export const DEFAULT_MODE_REPORT_SLICE = {
    tbm_native: 'overall',
    directional_walkforward: 'overall',
    directional_fixed_split: 'oos'
} as const satisfies Record<ModeId, ReportSliceId>

export function isWalkForwardModeId(modeId: ModeId): modeId is WalkForwardModeId {
    return modeId === 'tbm_native' || modeId === 'directional_walkforward'
}

export function getModeReportSlices<TMode extends ModeId>(modeId: TMode): readonly ReportSliceDescriptor<TMode>[] {
    return MODE_REPORT_SLICE_CATALOG[modeId] as readonly ReportSliceDescriptor<TMode>[]
}

export function getDefaultModeReportSlice<TMode extends ModeId>(modeId: TMode): ReportSliceDescriptor<TMode>['key'] {
    return DEFAULT_MODE_REPORT_SLICE[modeId] as ReportSliceDescriptor<TMode>['key']
}
