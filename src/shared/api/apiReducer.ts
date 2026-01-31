import { api } from './api'
import { ReducersMapObject } from '@reduxjs/toolkit'
import { StateSchema } from '@/app/providers'

/*
	apiReducer — сборка корневых редьюсеров.

	Зачем:
		- Добавляет api.reducer к динамическому набору редьюсеров.
*/

export function createRootReducer(asyncReducers: ReducersMapObject<StateSchema>): ReducersMapObject<StateSchema> {
    return {
        ...asyncReducers,
        [api.reducerPath]: api.reducer
        // Добавьте другие редьюсеры при необходимости.
    }
}

