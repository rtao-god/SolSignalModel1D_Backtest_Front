import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { API_BASE_URL } from '../configs/config'

/*
	authApi — API слой.

	Зачем:
		- Определяет общие настройки и контракты API.
*/
interface LoginRequest {
    identifier: string
    password: string
}

interface LoginResponse {
    id: string
    identifier: string
}

interface RegisterRequest {
    identifier: string
    password: string
}

interface RegisterResponse {
    id: string
    identifier: string
}

export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
    endpoints: builder => ({
        loginUser: builder.mutation<LoginResponse, LoginRequest>({
            query: credentials => ({
                url: 'login',
                method: 'POST',
                body: credentials
            })
        }),

        registerUser: builder.mutation<RegisterResponse, RegisterRequest>({
            query: credentials => ({
                url: 'register',
                method: 'POST',
                body: credentials
            })
        })
    })
})

export const { useLoginUserMutation, useRegisterUserMutation } = authApi

