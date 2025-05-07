import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { TUserDataForPutRequest } from '@/entities/User/model/types/UserSchema'
import { UserData } from '@/shared/types/user.types'

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: '/api',
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as any).auth?.token
            if (token) {
                headers.set('authorization', `Bearer ${token}`)
            }
            return headers
        }
    }),
    endpoints: builder => ({
        getUser: builder.query<UserData, void>({
            query: () => ({
                url: '/users-detail/',
                method: 'GET'
            })
        }),
        changeUserDetails: builder.mutation<UserData, TUserDataForPutRequest>({
            query: data => ({
                url: '/users-detail/',
                method: 'PUT',
                body: data
            })
        })
    })
})

export const { useGetUserQuery, useChangeUserDetailsMutation } = api
