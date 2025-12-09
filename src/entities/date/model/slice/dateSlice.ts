import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import DateSchema from '../types/DateSchema'

const initialState: DateSchema = {
    departureDate: null,
    arrivalDate: null,
    isSelectingDepartureDate: true
}

type UiDate = { value: string; dateObj: Date } | null

const dateSlice = createSlice({
    name: 'date',
    initialState,
    reducers: {
        setDepartureDate(state, action: PayloadAction<UiDate>) {
            console.log('[dateSlice] setDepartureDate', action.payload)
            state.departureDate = action.payload
        },
        setArrivalDate(state, action: PayloadAction<UiDate>) {
            console.log('[dateSlice] setArrivalDate', action.payload)
            state.arrivalDate = action.payload
        },
        setIsSelectingDepartureDate(state, action: PayloadAction<boolean>) {
            console.log('[dateSlice] setIsSelectingDepartureDate', action.payload)
            state.isSelectingDepartureDate = action.payload
        }
    }
})

export const { actions: dateActions } = dateSlice
export const { reducer: dateReducer } = dateSlice
