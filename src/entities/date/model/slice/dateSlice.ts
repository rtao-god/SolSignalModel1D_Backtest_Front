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
            state.departureDate = action.payload
        },
        setArrivalDate(state, action: PayloadAction<UiDate>) {
            state.arrivalDate = action.payload
        },
        setIsSelectingDepartureDate(state, action: PayloadAction<boolean>) {
            state.isSelectingDepartureDate = action.payload
        }
    }
})

export const { actions: dateActions } = dateSlice
export const { reducer: dateReducer } = dateSlice
