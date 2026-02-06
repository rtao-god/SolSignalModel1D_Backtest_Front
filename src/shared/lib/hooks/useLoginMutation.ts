import { useMutation } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setError } from '@/features/UserLogin/model/slice/loginSlice'
import axios from 'axios'

/*
	useLoginMutation — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useLoginMutation.
*/

export const useLoginMutation = (
    identifier: string,
    password: string 
) => {
    const navigate = useNavigate()
    const dispatch = useDispatch()

    return useMutation({
        mutationFn: async () => {
            const response = await axios.post('/api/login', { identifier, password })
            return response.data
        },
        mutationKey: ['login', identifier],
        onSuccess: data => {
            console.log(data)
            const storedIdentifier = localStorage.getItem('identifier')
            const storedPassword = localStorage.getItem('password')
            console.log('storedIdentifier: ', storedIdentifier, 'storedPassword: ', storedPassword)

            if (storedIdentifier == identifier && storedPassword == password) {
                console.log('true auth')
            } else {
                console.log('false auth')
            }

            navigate('/')
        },
        onError: () => {
            dispatch(setError('FALSE AUTH'))
            console.log('localStorage: ', localStorage)
        }
    })
}

