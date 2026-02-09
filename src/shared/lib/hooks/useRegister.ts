import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useRegisterUserMutation } from '@/shared/api/authApi'
import { userActions } from '@/entities/User'
import { setError } from '@/features/Registration/model/slice/registrationSlice'

export const useRegister = () => {
    const [registerUser, { isLoading }] = useRegisterUserMutation()
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const register = async (identifier: string, password: string) => {
        try {
            const newUser = await registerUser({ identifier, password }).unwrap()

            const userWithAuth = {
                ...newUser,
                isAuthenticated: true
            }
            dispatch(userActions.login(userWithAuth))

            navigate('/')
        } catch (error) {
            console.error('Ошибка регистрации:', error)
            dispatch(setError('Не удалось зарегистрироваться.'))
        }
    }

    return { register, isLoading }
}

