import { UserData } from '@/shared/types/user.types'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

/*
	auth — shared store.

	Зачем:
		- Хранит shared-состояние и логику auth/registration.
*/

interface AuthStore {
    isAuth: boolean
    user: null | UserData
    setIsAuth: (bol: boolean) => void
    setUser: (user: null | UserData) => void
}

export const useAuth = create<AuthStore>()(
    immer(set => ({
        isAuth: false,
        user: null,
        setIsAuth: (bol: boolean) => {
            set(state => {
                state.isAuth = bol
            })
        },
        setUser: (user: UserData | null) => {
            set(state => {
                state.user = user
            })
        }
    }))
)

