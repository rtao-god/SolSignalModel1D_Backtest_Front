import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { userActions } from '@/entities/User'

interface RegistrationResponse {
    id: number
    identifier: string
    password: string
}

interface RegistrationRequest {
    identifier: string
    password: string
}

export const registrationApi = createApi({
    reducerPath: 'registrationApi',
    baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    endpoints: builder => ({
        registerUser: builder.mutation<RegistrationResponse, RegistrationRequest>({
            query: ({ identifier, password }) => ({
                url: '/register',
                method: 'POST',
                body: { identifier, password }
            }),
            async onQueryStarted({ identifier, password }, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled
                    dispatch(userActions.login(data)) // Dispatch login on success
                } catch (error) {
                    console.error('Ошибка регистрации:', error)
                }
            }
        })
    })
})

export const { useRegisterUserMutation } = registrationApi
