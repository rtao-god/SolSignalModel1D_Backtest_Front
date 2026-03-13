import { createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { CONSTANS } from '@/shared/consts/localStorage'
import { User, userActions } from '@/entities/User'
import { API_BASE_URL } from '@/shared/configs/config'
import { logError } from '@/shared/lib/logging/logError'

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
                throw new Error('no data')
            } else {
                thunkAPI.dispatch(userActions.setAuthData(response.data))
                localStorage.setItem(CONSTANS.userLocalStorageKey, JSON.stringify(response.data))
            }
            return response.data
        } catch (error) {
            const normalizedError =
                error instanceof Error ? error : new Error(String(error ?? 'Unknown login request error.'))

            logError(normalizedError, undefined, {
                source: 'login-by-identifier',
                domain: 'api_transport',
                severity: 'warning'
            })
            return thunkAPI.rejectWithValue(resolveLoginErrorMessage(error))
        }
    }
)
