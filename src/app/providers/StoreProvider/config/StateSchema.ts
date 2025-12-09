import DateSchema from '@/entities/date/model/types/DateSchema'
import { UserSchema } from '@/entities/User'
import { RegistrationSchema } from '@/features/Registration'
import { LoginSchema } from '@/features/UserLogin'
import { authApi } from '@/shared/api/authApi'
import { api } from '@/shared/api'
import { registrationApi } from '@/shared/lib/hooks'
import { Reducer, AnyAction, ReducersMapObject, EnhancedStore } from '@reduxjs/toolkit'

export interface StateSchema {
    date?: DateSchema
    user?: UserSchema
    registration?: RegistrationSchema
    loginForm?: LoginSchema

    // RTK Query-слайсы
    [api.reducerPath]: ReturnType<typeof api.reducer>
    [authApi.reducerPath]: ReturnType<typeof authApi.reducer>
    [registrationApi.reducerPath]: ReturnType<typeof registrationApi.reducer>
}

export type StateSchemaKey = keyof StateSchema

export interface ReducerManager {
    getReducerMap: () => ReducersMapObject<StateSchema>
    reduce: (state: StateSchema | undefined, action: AnyAction) => StateSchema
    add: (key: StateSchemaKey, reducer: Reducer) => void
    remove: (key: StateSchemaKey) => void
}

export interface ReduxStoreWithManager extends EnhancedStore<StateSchema> {
    reducerManager: ReducerManager
}
