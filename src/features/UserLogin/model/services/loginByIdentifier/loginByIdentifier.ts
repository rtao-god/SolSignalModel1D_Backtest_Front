import { createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { CONSTANS } from '@/shared/consts/localStorage'
import { User, userActions } from '@/entities/User'
import { API_BASE_URL } from '@/shared/configs/config'
import { logError } from '@/shared/lib/logging/logError'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'

interface loginByIdentifierProps {
    identifier: string
    password: string
}

function resolveLoginErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const messageFromBody =
            (
                typeof error.response?.data === 'object' &&
                error.response?.data !== null &&
                'message' in error.response.data &&
                typeof (error.response.data as { message?: unknown }).message === 'string'
            ) ?
                (error.response.data as { message: string }).message.trim()
            :   null

        if (messageFromBody && messageFromBody.length > 0) {
            return messageFromBody
        }

        if (typeof error.message === 'string' && error.message.trim().length > 0) {
            return error.message.trim()
        }
    }

    return 'Authorization failed.'
}

export const loginByIdentifier = createAsyncThunk<User, loginByIdentifierProps>(
    'login/loginByIdentifier',
    async (authData, thunkAPI) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/login`, authData)
            if (!response.data) {
                throw new Error(
                    `[login-by-identifier] Login response payload is empty. ` +
                        `owner=frontend.login-by-identifier. ` +
                        `expected=Successful login response contains the authenticated user payload. ` +
                        `actual=HTTP request completed but response.data is empty. ` +
                        `requiredAction=Inspect the login API contract and the transport mapping for the authenticated user payload.`
                )
            } else {
                thunkAPI.dispatch(userActions.setAuthData(response.data))
                localStorage.setItem(CONSTANS.userLocalStorageKey, JSON.stringify(response.data))
            }
            return response.data
        } catch (error) {
            const normalizedError = normalizeErrorLike(error, 'Login request failed.', {
                source: 'login-by-identifier',
                domain: 'api_transport',
                owner: 'frontend.login-by-identifier',
                expected: 'Login request returns a user payload or a structured API error envelope.',
                actual: axios.isAxiosError(error)
                    ? `status=${error.response?.status ?? 'n/a'}; url=${error.config?.url ?? 'n/a'}`
                    : 'Login request failed before a valid user payload was returned.',
                requiredAction: 'Inspect the login API endpoint, credentials flow, and response mapping.',
                extra: axios.isAxiosError(error)
                    ? {
                          status: error.response?.status ?? null,
                          url: error.config?.url ?? null
                      }
                    : undefined
            })

            logError(normalizedError, undefined, {
                source: 'login-by-identifier',
                domain: 'api_transport',
                severity: 'warning',
                owner: 'frontend.login-by-identifier',
                expected: 'Login request returns a user payload or a structured API error envelope.',
                actual: axios.isAxiosError(error)
                    ? `status=${error.response?.status ?? 'n/a'}; url=${error.config?.url ?? 'n/a'}`
                    : 'Login request failed before a valid user payload was returned.',
                requiredAction: 'Inspect the login API endpoint, credentials flow, and response mapping.'
            })
            return thunkAPI.rejectWithValue(resolveLoginErrorMessage(error))
        }
    }
)
