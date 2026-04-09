export type ModeId = 'tbm_native' | 'directional_walkforward' | 'directional_fixed_split'

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
