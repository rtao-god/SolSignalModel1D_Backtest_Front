import { useDispatch } from 'react-redux'
import { useChangeUserDetailsMutation } from '@/entities/User/api/userApi'
import { userActions } from '@/entities/User'
import type { TUserDataForPutRequest } from '@/entities/User/model/types/UserSchema'
import { logError } from '@/shared/lib/logging/logError'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'

export const useUserMutate = () => {
    const [changeUserDetails, { isLoading }] = useChangeUserDetailsMutation()
    const dispatch = useDispatch()

    const updateUser = async (data: TUserDataForPutRequest) => {
        try {
            const updatedUser = await changeUserDetails(data).unwrap()

            dispatch(userActions.updateUser(updatedUser))
        } catch (error) {
            const normalizedError = normalizeErrorLike(error, 'Unknown user update error.', {
                source: 'user-update-hook',
                domain: 'api_transport'
            })

            logError(normalizedError, undefined, {
                source: 'user-update-hook',
                domain: 'api_transport',
                severity: 'warning'
            })
        }
    }

    return { updateUser, isLoading }
}
