import { createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { CONSTANS } from '@/shared/consts/localStorage'
import { User, userActions } from '@/entities/User'
import i18n from '@/shared/configs/i18n/i18n'

interface loginByIdentifierProps {
    identifier: string
    password: string
}

export const loginByIdentifier = createAsyncThunk<User, loginByIdentifierProps>(
    'login/loginByIdentifier',
    async (authData, thunkAPI) => {
        try {
            const response = await axios.post('/api/login', authData)
            if (!response.data) {
                throw new Error('no data')
            } else {
                thunkAPI.dispatch(userActions.setAuthData(response.data))
                localStorage.setItem(CONSTANS.userLocalStorageKey, JSON.stringify(response.data))
                console.log('RESPONSE: ', response.config.data)
            }
            return response.data
        } catch (error) {
            console.error(error)
            return thunkAPI.rejectWithValue(i18n.t('authorisationError'))
        }
    }
)
