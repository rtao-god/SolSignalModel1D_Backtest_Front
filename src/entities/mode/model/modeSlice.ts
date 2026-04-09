import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { DEFAULT_MODE, type ModeId } from './types'

interface ModeState {
    activeMode: ModeId
}

const initialState: ModeState = {
    activeMode: DEFAULT_MODE,
}

export const modeSlice = createSlice({
    name: 'mode',
    initialState,
    reducers: {
        setActiveMode(state, action: PayloadAction<ModeId>) {
            state.activeMode = action.payload
        },
    },
})

export const { setActiveMode } = modeSlice.actions
export default modeSlice.reducer
