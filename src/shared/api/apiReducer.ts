import { api } from './api'
import { ReducersMapObject } from '@reduxjs/toolkit'
import { StateSchema } from '@/app/providers'

export function createRootReducer(asyncReducers: ReducersMapObject<StateSchema>): ReducersMapObject<StateSchema> {
    return {
        ...asyncReducers,
        [api.reducerPath]: api.reducer
    }
}

