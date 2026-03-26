import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { userActions } from '@/entities/User'
import { API_BASE_URL } from '@/shared/configs/config'
import { logError } from '@/shared/lib/logging/logError'

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
    baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
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
                    const normalizedError =
                        error instanceof Error ? error : (
                            new Error(String(error ?? 'Unknown registration mutation error.'))
                        )

                    logError(normalizedError, undefined, {
                        source: 'registration-mutation',
                        domain: 'api_transport',
                        severity: 'warning'
                    })
                }
            }
        })
    })
})

export const { useRegisterUserMutation } = registrationApi
