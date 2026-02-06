import cls from './Profile.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import ProfileProps from './types'
import UserInfo from '../../UserInfo/ui/UserInfo'
import { LogoutBtn } from '@/widgets/components'
import { useDispatch } from 'react-redux'
import { userActions } from '@/entities/User'

/*
	Profile — страница профиля пользователя.

	Зачем:
		- Показывает информацию о пользователе.
		- Даёт кнопку выхода из системы.
*/

export default function Profile({ className }: ProfileProps) {
    const dispatch = useDispatch()
    return (
        <div className={classNames(cls.Profile, {}, [className ?? ''])}>
            <UserInfo />

            <LogoutBtn />
        </div>
    )
}
