import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useChangeUserDetailsMutation } from '@/entities/User/api/userApi'
import { userActions } from '@/entities/User'
import type { TUserDataForPutRequest } from '@/entities/User/model/types/UserSchema'

/*
	useUserMutate — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useUserMutate.
*/

export const useUserMutate = () => {
    const [changeUserDetails, { isLoading }] = useChangeUserDetailsMutation()
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const updateUser = async (data: TUserDataForPutRequest) => {
        try {
            const updatedUser = await changeUserDetails(data).unwrap()

            dispatch(userActions.updateUser(updatedUser))
            console.log('Успешное обновление данных пользователя:', updatedUser)
        } catch (error) {
            console.error('Ошибка обновления данных пользователя:', error)
        }
    }

    return { updateUser, isLoading }
}

