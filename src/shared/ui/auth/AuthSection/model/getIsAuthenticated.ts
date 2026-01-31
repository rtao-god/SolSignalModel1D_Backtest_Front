import { StateSchema } from '@/app/providers/StoreProvider'

export const getIsAuthenticated = (state: StateSchema) => state.user?.authData

