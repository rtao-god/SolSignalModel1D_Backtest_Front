import { useState } from 'react'
import PasswordInputFieldProps from './types'
import cls from './PasswordInputField.module.scss'
import { Input, Row } from '@/shared/ui'
import { ShowPassword } from '@/features/ShowPassword'
import classNames from '@/shared/lib/helpers/classNames'
import { useTranslation } from 'react-i18next'

const ERROR_MESSAGES = {
    PASSWORD_REQUIRED: 'Введите пароль.'
}

const { PASSWORD_REQUIRED } = ERROR_MESSAGES

export default function PasswordInputField({
    className,
    onChangePassword,
    placeholder,
    loginError
}: PasswordInputFieldProps) {
    const { t } = useTranslation('auth')
    const [isShow, setIsShow] = useState(false)

    const handleClick = () => {
        setIsShow(prev => !prev)
    }

    return (
        <div className={classNames(cls.Password_input_field, {}, [])}>
            <Row gap={0} className={loginError ? `${cls.error} ${cls.pass}` : cls.pass}>
                <Input
                    className={className}
                    onChange={onChangePassword}
                    type={isShow ? 'text' : 'password'}
                    placeholder={placeholder ?? t('login.passwordPlaceholder')}
                    border='none'
                    borderRadius='8px 0px 0px 8px'
                    error={loginError?.includes(PASSWORD_REQUIRED) ? t('login.passwordError') : ''}
                />
                <ShowPassword isShow={isShow} onClick={handleClick} />
            </Row>
        </div>
    )
}
