import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { userActions } from '@/entities/User'

export const useLogout = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const logout = () => {
        dispatch(userActions.logout())
        navigate('/')
    }

    return { logout }
}

