import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import RegistrationSchema from '../types/RegistrationSchema'

const initialState: RegistrationSchema = {
    identifier: '',
    birthday: '',
    password: '',
    confirmPassword: '',
    isChecked: false,
    error: ''
}

export const registrationSlice = createSlice({
    name: 'registration',
    initialState,
    reducers: {
        setIdentifier: (state, action: PayloadAction<string>) => {
            state.identifier = action.payload
        },
        setBirthday: (state, action: PayloadAction<string>) => {
            state.birthday = action.payload
        },
        setPassword: (state, action: PayloadAction<string>) => {
            state.password = action.payload
        },
        setConfirmPassword: (state, action: PayloadAction<string>) => {
            state.confirmPassword = action.payload
        },
        setIsChecked: (state, action: PayloadAction<boolean>) => {
            state.isChecked = action.payload
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload
        }
    }
})

export const { setIdentifier, setBirthday, setPassword, setConfirmPassword, setIsChecked, setError } =
    registrationSlice.actions

export default registrationSlice.reducer
