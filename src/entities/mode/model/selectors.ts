import type { ModeId } from './types'

interface RootStateWithMode {
    mode: { activeMode: ModeId }
}

export const selectActiveMode = (state: RootStateWithMode): ModeId => state.mode.activeMode
