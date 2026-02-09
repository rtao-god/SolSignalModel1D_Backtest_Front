import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { User } from '@/entities/User'
import { API_BASE_URL } from '@/shared/configs/config'

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
    baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
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

