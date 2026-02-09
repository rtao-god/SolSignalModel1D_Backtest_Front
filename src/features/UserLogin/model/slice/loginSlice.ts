import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { loginByIdentifier } from '../services/loginByIdentifier/loginByIdentifier'
import LoginSchema from '../types/LoginSchema'

const initialState: LoginSchema = {
    isLoading: false,
    username: '',
    identifier: '', // It can be by mail or phone
    password: '',
    error: ''
}

const loginSlice = createSlice({
    name: 'login',
    initialState,
    reducers: {
        setIdentifier(state, action: PayloadAction<string>) {
            state.identifier = action.payload
        },
        setPassword(state, action: PayloadAction<string>) {
            state.password = action.payload
        },
        setError(state, action: PayloadAction<string>) {
            state.error = action.payload
        }
    },
    extraReducers: builder => {
        builder
            .addCase(loginByIdentifier.pending, state => {
                state.isLoading = true
                state.error = undefined
            })
            .addCase(loginByIdentifier.fulfilled, state => {
                state.isLoading = false
                state.error = ''
            })
            .addCase(loginByIdentifier.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })
    }
})

export const { setIdentifier, setPassword, setError } = loginSlice.actions

export default loginSlice.reducer
