import { UserData } from '@/shared/types/user.types'

export interface User {
    id: number | string
    identifier: string
    password?: string
    isAuthenticated?: boolean
}

export interface UserSchema {
    authData?: User | null
}

export type TUserDataForPutRequest = Partial<UserData>
