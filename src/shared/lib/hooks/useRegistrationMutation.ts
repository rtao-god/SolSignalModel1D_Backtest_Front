import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { User } from '@/entities/User'

/*
	useRegistrationMutation — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useRegistrationMutation.
*/

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
            })
        })
    })
})

export const { useRegisterUserMutation } = registrationApi

