import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { userActions } from '@/entities/User'

/*
	useLogout — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useLogout.
*/

export const useLogout = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const logout = () => {
        dispatch(userActions.logout())
        navigate('/')
    }

    return { logout }
}

