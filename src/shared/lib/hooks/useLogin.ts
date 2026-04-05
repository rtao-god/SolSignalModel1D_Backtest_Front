import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useLoginUserMutation } from '@/shared/api/authApi'
import { userActions } from '@/entities/User'
import { setError } from '@/features/UserLogin/model/slice/loginSlice'
import { logError } from '@/shared/lib/logging/logError'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'

export const useLogin = () => {
    const [loginUser, { isLoading }] = useLoginUserMutation()
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const login = async (identifier: string, password: string) => {
        try {
            const user = await loginUser({ identifier, password }).unwrap()
            dispatch(userActions.login(user))
            navigate('/')
        } catch (error) {
            const normalizedError = normalizeErrorLike(error, 'Unknown login hook error.', {
                source: 'login-hook',
                domain: 'api_transport'
            })

            logError(normalizedError, undefined, {
                source: 'login-hook',
                domain: 'api_transport',
                severity: 'warning'
            })
            dispatch(setError('Неверный логин или пароль.'))
        }
    }

    return { login, isLoading }
}
