import { useTranslation } from 'react-i18next'
import { ChangeEvent, FormEvent, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import cls from './UserLogin.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { getLoginIsLoading, getLoginError, getLoginIdentifier } from '../../model/selectors'
import { Input, Btn, Text, Rows, Link } from '@/shared/ui'
import PasswordInputField from '../PasswordInputField/PasswordInputField'
import LoginFormProps from './types'
import { setError } from '@/features/Registration/model/slice/registrationSlice'
import { useLogin } from '@/shared/lib/hooks'
import { IDENTIFIER_INVALID, IDENTIFIER_REQUIRED } from '@/shared/consts/authLogin'

export default function UserLogin({ className }: LoginFormProps) {
    const { t } = useTranslation('auth')
    const dispatch = useDispatch()

    const [identifierValue, setIdentifierValue] = useState<string>('')
    const identifier = useSelector(getLoginIdentifier)

    const [password, setPassword] = useState<string>('')

    const isLoading = useSelector(getLoginIsLoading)
    const error = useSelector(getLoginError)

    const { login } = useLogin()

    function onChangeIdentifier(e: ChangeEvent<HTMLInputElement>) {
        setIdentifierValue(e.target.value)
    }

    function onChangePassword(e: ChangeEvent<HTMLInputElement>) {
        setPassword(e.target.value)
    }

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!identifier) return dispatch(setError(IDENTIFIER_REQUIRED))

        if (identifier === identifierValue) return dispatch(setError(IDENTIFIER_INVALID))
        login(identifier, password)
    }

    return (
        <div className={classNames(cls.User_login, {}, [className ?? ''])}>
            <form onSubmit={handleLogin}>
                <Input
                    type='text'
                    onChange={onChangeIdentifier}
                    placeholder={t('login.identifierPlaceholder')}
                    error={error?.includes(IDENTIFIER_REQUIRED) ? t('login.identifierError') : ''}
                />
                <PasswordInputField
                    onChangePassword={onChangePassword}
                    placeholder={t('login.passwordPlaceholder')}
                    loginError={error}
                />
                <Text color='#d64657' position='center'>
                    {error}
                </Text>
                <Rows gap={20} rows={['auto']}>
                    <Btn className={cls.login_btn} color='#0064FA' disabled={isLoading}>
                        {t('login.submit')}
                    </Btn>
                    <div className={cls.register}>
                        <Text color='#7D7F82' variant='body-lg' type='p'>
                            {t('login.noAccount')}
                        </Text>
                        <Link to='/registration' className={cls.register_text}>
                            <Text color='#0064FA' variant='body-lg' type='p'>
                                {t('login.registerLink')}
                            </Text>
                        </Link>
                    </div>
                </Rows>
            </form>
        </div>
    )
}
