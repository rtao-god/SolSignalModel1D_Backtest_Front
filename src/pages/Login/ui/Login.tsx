import classNames from '@/shared/lib/helpers/classNames'
import cls from './Login.module.scss'
import { Line, Row, Rows, AuthContainer, Text } from '@/shared/ui'
import AuthWithGoogle from '@/features/AuthWithGoogle/AuthWithGoogle'
import LoginProps from './types'
import { UserLogin } from '@/features/UserLogin'
import { useTranslation } from 'react-i18next'

export default function Login({ className }: LoginProps) {
    const { t } = useTranslation('auth')

    return (
        <div className={classNames(cls.Login, {}, [className ?? ''])}>
            <AuthContainer title={t('login.pageTitle')}>
                <UserLogin />
                <Row gap={20}>
                    <Line color='#D6E7FF' />
                    <Text variant='body-md' color='#D6E7FF'>
                        {t('login.divider')}
                    </Text>
                    <Line color='#D6E7FF' />
                </Row>
                <Rows gap={16} rows={['auto']}>
                    <AuthWithGoogle />
                </Rows>
            </AuthContainer>
        </div>
    )
}
