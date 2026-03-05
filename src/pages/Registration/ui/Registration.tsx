import classNames from '@/shared/lib/helpers/classNames'
import cls from './Registration.module.scss'
import { Row, AuthContainer } from '@/shared/ui'
import { RegistrationForm } from '@/features/Registration'
import AuthWithGoogle from '@/features/AuthWithGoogle/AuthWithGoogle'
import RegistrationProps from './types'
import { useTranslation } from 'react-i18next'

export default function Registration({ className }: RegistrationProps) {
    const { t } = useTranslation('auth')

    return (
        <div className={classNames(cls.Registration, {}, [className ?? ''])}>
            <AuthContainer title={t('registration.pageTitle')}>
                <RegistrationForm />
                <Row gap={16} style={{ justifyContent: 'center' }}>
                    <AuthWithGoogle />
                </Row>
            </AuthContainer>
        </div>
    )
}
