import classNames from '@/shared/lib/helpers/classNames'
import cls from './Registration.module.scss'
import { Row, AuthContainer } from '@/shared/ui'
import { RegistrationForm } from '@/features/Registration'
import AuthWithGoogle from '@/features/AuthWithGoogle/AuthWithGoogle'
import RegistrationProps from './types'

export default function Registration({ className }: RegistrationProps) {
    return (
        <div className={classNames(cls.Registration, {}, [className ?? ''])}>
            <AuthContainer title='Регистрация'>
                <RegistrationForm />
                <Row gap={16} style={{ justifyContent: 'center' }}>
                    <AuthWithGoogle />

                </Row>
            </AuthContainer>
        </div>
    )
}
