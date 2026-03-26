import { useMutation } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setError } from '@/features/UserLogin/model/slice/loginSlice'
import axios from 'axios'
import { API_BASE_URL } from '@/shared/configs/config'

/*
	useLoginMutation — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useLoginMutation.
*/
export const useLoginMutation = (identifier: string, password: string) => {
    const navigate = useNavigate()
    const dispatch = useDispatch()

    return useMutation({
        mutationFn: async () => {
            const response = await axios.post(`${API_BASE_URL}/login`, { identifier, password })
            return response.data
        },
        mutationKey: ['login', identifier],
        onSuccess: () => {
            navigate('/')
        },
        onError: () => {
            dispatch(setError('FALSE AUTH'))
        }
    })
}
