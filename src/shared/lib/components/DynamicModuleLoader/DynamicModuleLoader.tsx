import { ReduxStoreWithManager } from '@/app/providers/StoreProvider'
import { ReactNode, useEffect } from 'react'
import { StateSchemaKey } from '@/app/providers/StoreProvider/config/StateSchema'
import { Reducer } from '@reduxjs/toolkit'
import { useDispatch, useStore } from 'react-redux'

export type ReducersList = {
    [name in StateSchemaKey]?: Reducer
}

type ReducersListEntry = [StateSchemaKey, Reducer]

interface DynamicModuleLoaderProps {
    children: ReactNode
    reducers: ReducersList
    removeAfterUnmount?: boolean
}

export default function DynamicModuleLoader({
    children,
    reducers,
    removeAfterUnmount = false
}: DynamicModuleLoaderProps) {
    const store = useStore() as ReduxStoreWithManager
    const dispatch = useDispatch()

    useEffect(() => {
        ;(Object.entries(reducers) as ReducersListEntry[]).forEach(([name, reducer]) => {
            store.reducerManager.add(name, reducer)
            dispatch({ type: `@INIT ${name}`, reducers })
        })

        return () => {
            if (removeAfterUnmount) {
                ;(Object.entries(reducers) as ReducersListEntry[]).forEach(([name]) => {
                    store.reducerManager.remove(name)
                    dispatch({ type: `@DESTROY ${name}`, reducers })
                })
            }
        }
    }, [reducers, removeAfterUnmount, dispatch, store.reducerManager])

    return <div>{children}</div>
}

