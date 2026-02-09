import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { TUserDataForPutRequest } from '../model/types/UserSchema'
import { UserData } from '@/shared/types/user.types'
import { API_BASE_URL } from '@/shared/configs/config'

export const userApi = createApi({
    reducerPath: 'userApi',
    baseQuery: fetchBaseQuery({
        baseUrl: API_BASE_URL,
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as any).auth?.token
            if (token) {
                headers.set('authorization', `Bearer ${token}`)
            }
            return headers
        }
    }),
    endpoints: builder => ({
        changeUserDetails: builder.mutation<UserData, TUserDataForPutRequest>({
            query: data => ({
                url: '/users-detail/',
                method: 'PUT',
                body: data
            })
        })
    })
})

export const { useChangeUserDetailsMutation } = userApi
