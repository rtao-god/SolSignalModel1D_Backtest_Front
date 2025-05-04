import classNames from '@/shared/lib/helpers/classNames'
import cls from './Login.module.scss'
import { Line, Row, Rows, AuthContainer, Text } from '@/shared/ui'
import AuthWithGoogle from '@/features/AuthWithGoogle/AuthWithGoogle'
import LoginProps from './types'
import { UserLogin } from '@/features/UserLogin'

export default function Login({ className }: LoginProps) {
    return (
        <div className={classNames(cls.Login, {}, [className ?? ''])}>
            <AuthContainer title='Вход'>
                <UserLogin />
                <Row gap={20}>
                    <Line color='#D6E7FF' />
                    <Text type='p' fz='14px' color='#D6E7FF'>
                        Или
                    </Text>
                    <Line color='#D6E7FF' />
                </Row>
                <Rows gap={16} rows={['auto']}>
                    <AuthWithGoogle />
                    {/*   <AuthWithFacebook />
                <AuthWithApple /> */}
                </Rows>
            </AuthContainer>
        </div>
    )
}
