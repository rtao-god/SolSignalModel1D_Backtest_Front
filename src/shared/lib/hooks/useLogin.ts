import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useLoginUserMutation } from '@/shared/api/authApi'
import { userActions } from '@/entities/User'
import { setError } from '@/features/UserLogin/model/slice/loginSlice'

/*
	useLogin — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useLogin.
*/

export const useLogin = () => {
    const [loginUser, { isLoading }] = useLoginUserMutation()
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const login = async (identifier: string, password: string) => {
        try {
            const user = await loginUser({ identifier, password }).unwrap()

            // Сохраняем данные пользователя в Redux-состояние.
            dispatch(userActions.login(user))
            navigate('/')
        } catch (error) {
            console.error('Ошибка авторизации:', error)
            dispatch(setError('Неверный логин или пароль.'))
        }
    }

    return { login, isLoading }
}

