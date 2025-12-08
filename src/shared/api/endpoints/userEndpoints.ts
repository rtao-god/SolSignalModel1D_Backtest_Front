import type { UserData } from '@/shared/types/user.types'
import type { TUserDataForPutRequest } from '@/entities/User/model/types/UserSchema'
import { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

/**
 * Группа эндпоинтов, связанных с пользователем / профилем.
 * Каждый endpoint использует URL и метод из централизованного API_ROUTES.
 */
export const buildUserEndpoints = (builder: ApiEndpointBuilder) => {
    const { detailGet, detailPut } = API_ROUTES.user

    return {
        getUser: builder.query<UserData, void>({
            query: () => ({
                url: detailGet.path,
                method: detailGet.method
            })
        }),

        changeUserDetails: builder.mutation<UserData, TUserDataForPutRequest>({
            query: (data: TUserDataForPutRequest) => ({
                url: detailPut.path,
                method: detailPut.method,
                body: data
            })
        })
    }
}
