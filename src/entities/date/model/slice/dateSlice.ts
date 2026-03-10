import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import DateSchema, { StoredDateValue } from '../types/DateSchema'

const initialState: DateSchema = {
    departureDate: null,
    arrivalDate: null
}

const dateSlice = createSlice({
    name: 'date',
    initialState,
    reducers: {
        setDepartureDate(state, action: PayloadAction<StoredDateValue>) {
            state.departureDate = action.payload
        },
        setArrivalDate(state, action: PayloadAction<StoredDateValue>) {
            state.arrivalDate = action.payload
        },
        clearDateRange(state) {
            state.departureDate = null
            state.arrivalDate = null
        }
    }
})

export const { actions: dateActions } = dateSlice
export const { reducer: dateReducer } = dateSlice
