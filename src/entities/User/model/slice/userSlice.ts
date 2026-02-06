import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { User, UserSchema } from '../types/UserSchema'

const initialState: UserSchema = {
    authData: null
}

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        login: (state, action: PayloadAction<User>) => {
            state.authData = { ...action.payload, isAuthenticated: true }
        },
        setAuthData: (state, action: PayloadAction<User | null>) => {
            state.authData = action.payload
            if (state.authData) {
                state.authData.isAuthenticated = state.authData.isAuthenticated ?? true
            }
        },
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (!state.authData) {
                return
            }
            state.authData = { ...state.authData, ...action.payload }
        },
        logout: state => {
            if (state.authData) {
                state.authData.isAuthenticated = false
                state.authData = null
            }
        }
    }
})

export const { actions: userActions } = userSlice
export const { reducer: userReducer } = userSlice
