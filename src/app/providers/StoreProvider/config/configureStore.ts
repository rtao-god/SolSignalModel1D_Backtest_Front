import { dateReducer } from '@/entities/date'
import { Reducer, configureStore, ReducersMapObject } from '@reduxjs/toolkit'
import { createReducerManager } from './reducerManager'
import { ReduxStoreWithManager, StateSchema } from './StateSchema'
import { authApi } from '@/shared/api/authApi'
import { api } from '@/shared/api'
import { loginReducer } from '@/features/UserLogin'
import { registrationReducer } from '@/features/Registration'
import { userReducer } from '@/entities/User'
import { registrationApi } from '@/shared/lib/hooks'

export default function createReduxStore(initialState?: StateSchema, asyncReducers?: ReducersMapObject<StateSchema>) {
    const rootReducers: ReducersMapObject<StateSchema> = {
        ...asyncReducers,

        [api.reducerPath]: api.reducer,
        [authApi.reducerPath]: authApi.reducer,
        [registrationApi.reducerPath]: registrationApi.reducer,

        // обычные слайсы
        date: dateReducer,
        user: userReducer,
        registration: registrationReducer,
        loginForm: loginReducer
    }

    const reducerManager = createReducerManager(rootReducers)

    const store = configureStore({
        reducer: reducerManager.reduce as Reducer<StateSchema>,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware().concat(api.middleware, authApi.middleware, registrationApi.middleware),
        preloadedState: initialState
    }) as ReduxStoreWithManager

    store.reducerManager = reducerManager

    return store
}

const tempStore = createReduxStore()

export type RootState = ReturnType<typeof tempStore.getState>
export type AppDispatch = typeof tempStore.dispatch
