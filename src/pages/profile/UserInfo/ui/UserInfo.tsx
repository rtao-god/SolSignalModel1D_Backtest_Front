import { ChangeEvent } from 'react'

import { Text } from '@/shared/ui'
import { useAuth } from '@/shared/model/store/auth'

import noImageBlue from '../../assets/noImageRed.svg'
import noImageRed from '../../assets/noImageRed.svg'
import cls from './UserInfo.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import UserInfoProps from './types'
import { getFullUsernameWithInitials } from '@/entities/User/model/selectors/getFullUsernameWithInitials'

export default function UserInfo({ className }: UserInfoProps) {
    const { user } = useAuth()
    const sick = user
    console.log('user', user)

    return (
        <div className={classNames(cls.User_info, {}, [className ?? ''])}>
            <div className={cls.image}>
                <img
                    src={
                        !user || (user && !user.image) ?
                            sick ?
                                noImageRed
                            :   noImageBlue
                        :   user && user.image
                    }
                    alt=''
                />
                <input
                    accept='.jpg, .png, jpeg'
                    type='file'
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files

                        if (file) {
                            console.log(file[0])
                        }
                    }}
                />
            </div>
            <div className={cls.data}>
                <Text type='h2' color='#262626' fz='20px'>
                    {getFullUsernameWithInitials((user && user.last_name) ?? '', (user && user.first_name) ?? '', '')}
                </Text>
                <Text color='#B1B2B4' fz='14px'>
                    {user?.group?.name ?? ''}
                </Text>
            </div>
        </div>
    )
}
