import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useRegisterUserMutation } from '@/shared/api/authApi'
import { userActions } from '@/entities/User'
import { setError } from '@/features/Registration/model/slice/registrationSlice'

/*
	useLogout — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useLogout.
*/

export const useRegister = () => {
    const [logoutUser, { isLoading }] = useRegisterUserMutation()
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const register = async (identifier: string, password: string) => {
        try {
            const newUser = await logoutUser({ identifier, password }).unwrap()

            const userWithAuth = {
                ...newUser,
                isAuthenticated: true
            }
            dispatch(userActions.logout(userWithAuth))

            navigate('/')
        } catch (error) {
            console.error('Ошибка регистрации:', error)
            dispatch(setError('Не удалось зарегистрироваться.'))
        }
    }

    return { register, isLoading }
}

