import cls from './Profile.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import ProfileProps from './types'
import UserInfo from '../../UserInfo/ui/UserInfo'

export default function Profile({ className }: ProfileProps) {
    return (
        <div className={classNames(cls.Profile, {}, [className ?? ''])}>
            <UserInfo />
        </div>
    )
}
