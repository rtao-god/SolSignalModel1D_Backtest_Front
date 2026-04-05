import classNames from '@/shared/lib/helpers/classNames'
import cls from './Username.module.scss'
import { Text } from '@/shared/ui'
import UsernameProps from './types'

export default function Username({ className, name }: UsernameProps) {
    return (
        <div className={classNames(cls.Username, {}, [className ?? ''])}>
            <Text type='h2' variant='body-md'>
                name: {name}
            </Text>
        </div>
    )
}
