import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface RegistrationStoreProps {
    identifier: string
    setIdentifier: (identifier: string) => void
    email: string
    password: string
    password2: string
    number: string
    setEmail: (email: string) => void
    setPassword: (pass: string) => void
    setPassword2: (pass: string) => void
    setNumber: (number: string) => void
}

export const useRegistration = create<RegistrationStoreProps>()(
    immer(set => ({
        identifier: '',
        setIdentifier: (identifier: string) => {
            set(state => {
                state.identifier = identifier
            })
        },
        email: '',
        password: '',
        password2: '',
        number: '',
        setEmail: (email: string) => {
            set(state => {
                state.email = email
            })
        },
        setPassword: (pass: string) => {
            set(state => {
                state.password = pass
            })
        },

        setPassword2: (pass: string) => {
            set(state => {
                state.password2 = pass
            })
        },

        setNumber: (number: string) => {
            set(state => {
                state.number = number
            })
        }
    }))
)

