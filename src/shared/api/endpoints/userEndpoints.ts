import type { UserData } from '@/shared/types/user.types'
import type { TUserDataForPutRequest } from '@/entities/User/model/types/UserSchema'
import { ApiEndpointBuilder } from '../types'

/**
 * Группа эндпоинтов, связанных с пользователем / профилем.
 * builder здесь держим как any, чтобы не протаскивать сложные generic-типы RTK Query.
 * При этом каждый endpoint остаётся строго типизирован по <Result, Arg>.
 */
export const buildUserEndpoints = (builder: ApiEndpointBuilder) => ({
    getUser: builder.query<UserData, void>({
        query: () => ({
            url: '/users-detail/',
            method: 'GET'
        })
    }),

    changeUserDetails: builder.mutation<UserData, TUserDataForPutRequest>({
        query: (data: TUserDataForPutRequest) => ({
            url: '/users-detail/',
            method: 'PUT',
            body: data
        })
    })
})
