import { UserGroupProps } from './types'
import { Text } from '@/shared/ui'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './UserGroup.module.scss'

export default function UserGroup({ className, group }: UserGroupProps) {
    return (
        <div className={classNames(cls.User_group, {}, [className ?? ''])}>
            <Text variant='body-lg' color='#7D7F82'>
                {group}
            </Text>
        </div>
    )
}
