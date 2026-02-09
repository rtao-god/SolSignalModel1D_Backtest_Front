import { useTranslation } from 'react-i18next'
import { ChangeEvent, FormEvent, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import cls from './UserLogin.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { getLoginIsLoading, getLoginError, getLoginConfirmPassword, getLoginIdentifier } from '../../model/selectors'
import { Input, Btn, Text, Rows, Link } from '@/shared/ui'
import PasswordInputField from '../PasswordInputField/PasswordInputField'
import LoginFormProps from './types'
import { setError } from '@/features/Registration/model/slice/registrationSlice'
import { useLogin } from '@/shared/lib/hooks'
import { IDENTIFIER_INVALID, IDENTIFIER_REQUIRED } from '@/shared/consts/authLogin'
import { getIsAuthenticated } from '@/shared/ui/auth/AuthSection/model/getIsAuthenticated'

export default function UserLogin({ className }: LoginFormProps) {
    const { t } = useTranslation()
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

    console.log()
    console.log(
        'ERROR: ',
        error,
        localStorage.user,
        '\n user: ',
        identifier,
        password,
        '\n isAuthenticated: ',
        getIsAuthenticated
    )

    return (
        <div className={classNames(cls.User_login, {}, [className ?? ''])}>
            <form onSubmit={handleLogin}>
                <Input
                    type='text'
                    onChange={onChangeIdentifier}
                    placeholder={t('EnterEmailOrPhone')}
                    error={error?.includes(IDENTIFIER_REQUIRED) ? 'Ошибка в' : ''}

                />
                <PasswordInputField
                    onChangePassword={onChangePassword}
                    placeholder={t('EnterThePassword')}
                    loginError={error}

                />
                <Text color='#d64657' position='center'>
                    {error}
                </Text>
                <Rows gap={20} rows={['auto']}>
                    <Btn className={cls.login_btn} color='#0064FA' disabled={isLoading}>
                        {t('Login')}
                    </Btn>
                    <div className={cls.register}>
                        <Text color='#7D7F82' fz='16px' type='p'>
                            {t("Don't have an account?")}
                        </Text>
                        <Link to='/registration' className={cls.register_text}>
                            <Text color='#0064FA' fz='16px' type='p'>
                                {t('Register')}
                            </Text>
                        </Link>
                    </div>
                </Rows>
            </form>
        </div>
    )
}
