import cls from './Profile.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import ProfileProps from './types'
import UserInfo from '../../UserInfo/ui/UserInfo'
import { LogoutBtn } from '@/widgets/components'
import { useDispatch } from 'react-redux'
import { userActions } from '@/entities/User'

export default function Profile({ className }: ProfileProps) {
    const dispatch = useDispatch()
    console.log('dispatch: ', dispatch(userActions.login))

    return (
        <div className={classNames(cls.Profile, {}, [className ?? ''])}>
            <UserInfo />

            <LogoutBtn />
        </div>
    )
}
