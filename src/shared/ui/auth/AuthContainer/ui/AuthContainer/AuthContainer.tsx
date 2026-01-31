import AuthContainerProps from './types'
import cls from './AuthContainer.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { WhiteContentBlock, Text } from '@/shared/ui'

export default function AuthContainer({ className, children, title }: AuthContainerProps) {
    return (
        <div className={classNames(cls.Auth_container, {}, [className ?? ''])}>
            <WhiteContentBlock className={cls.wrapper}>
                <Text className={cls.title} color='#e6edf3' type='h2' position='center' fz='24px'>
                    {title}
                </Text>
                {children}
            </WhiteContentBlock>
        </div>
    )
}

