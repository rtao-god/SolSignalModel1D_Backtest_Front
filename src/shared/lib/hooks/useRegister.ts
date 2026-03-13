import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useRegisterUserMutation } from '@/shared/api/authApi'
import { userActions } from '@/entities/User'
import { setError } from '@/features/Registration/model/slice/registrationSlice'
import { logError } from '@/shared/lib/logging/logError'

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
            const normalizedError =
                error instanceof Error ? error : new Error(String(error ?? 'Unknown register hook error.'))

            logError(normalizedError, undefined, {
                source: 'register-hook',
                domain: 'api_transport',
                severity: 'warning'
            })
            dispatch(setError('Не удалось зарегистрироваться.'))
        }
    }

    return { register, isLoading }
}
