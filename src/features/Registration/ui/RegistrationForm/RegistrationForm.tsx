import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Btn, Rows, Input, Text } from '@/shared/ui'
import classNames from '@/shared/lib/helpers/classNames'
import { useRegister } from '@/shared/lib/hooks/useRegister'
import cls from './RegistrationForm.module.scss'

// import { Policy } from "../Policy";
import RegistrationFormProps from './types'
import {
    getBirthday,
    getConfirmPassword,
    getError,
    getIdentifier,
    getIsChecked,
    getPassword
} from '../../model/selectors'
import {
    setBirthday,
    setPassword,
    setConfirmPassword,
    setError,
    setIdentifier,
    setIsChecked
} from '../../model/slice/registrationSlice'
import {
    BIRTHDAY_COMPLETE,
    BIRTHDAY_REQUIRED,
    IDENTIFIER_INVALID,
    IDENTIFIER_REQUIRED,
    PASSWORD_MISMATCH,
    PASSWORD_REQUIRED,
    PASSWORD_SHORT,
    TERMS_REQUIRED
} from '@/shared/consts/authRegister'
import Checkbox from '../Checkbox/Checkbox'
import { useDebounce } from '@/shared/lib/hooks/useDebounce'

export default function RegistrationForm({ className }: RegistrationFormProps) {
    const birthday = useSelector(getBirthday)
    const identifier = useSelector(getIdentifier)
    const [localIdentifier, setLocalIdentifier] = useState<string>('')
    const password = useSelector(getPassword)
    const confirmPassword = useSelector(getConfirmPassword)
    const isChecked = useSelector(getIsChecked)
    const error = useSelector(getError)
    const dispatch = useDispatch()
    const [isShowValue, setIsShowValue] = useState<boolean>(false)
    const [inputDateValue, setInputDateValue] = useState<string>('ГГГГ-ММ-ДД')
    const { register } = useRegister()

    const onFocusHandler = () => {
        setIsShowValue(true)
    }
    const onBlurHandler = () => {
        setIsShowValue(false)
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,6})+$/
    const phoneRegex = /^(\+?\d{1,3}[- ]?)?(\(?\d{3}\)?[- ]?)?[\d -]{7,10}$/

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        const digitsOnly = value.replace(/\D/g, '')
        let formattedDate = 'ГГГГ-ММ-ДД'

        switch (name) {
            case 'birthday':
                for (let i = 0; i < digitsOnly.length; i++) {
                    if (i === 0) {
                        formattedDate = formattedDate.replace('Г', digitsOnly[i])
                    } else if (i === 1) {
                        formattedDate = formattedDate.replace('Г', digitsOnly[i])
                    } else if (i === 2) {
                        formattedDate = formattedDate.replace('Г', digitsOnly[i])
                    } else if (i === 3) {
                        formattedDate = formattedDate.replace('Г', digitsOnly[i])
                    } else if (i === 4) {
                        formattedDate = formattedDate.replace('М', digitsOnly[i])
                    } else if (i === 5) {
                        formattedDate = formattedDate.replace('М', digitsOnly[i])
                    } else if (i === 6) {
                        formattedDate = formattedDate.replace('Д', digitsOnly[i])
                    } else if (i === 7) {
                        formattedDate = formattedDate.replace('Д', digitsOnly[i])
                    }
                }

                setInputDateValue(formattedDate)
                dispatch(setBirthday(formattedDate.replace(/\D/g, '')))
                break

            case 'identifier':
                useCallback(() => {
                    dispatch(setIdentifier(value))
                }, [])
                break

            case 'password':
                dispatch(setPassword(value))
                if (value.length < 4) {
                    dispatch(setError(PASSWORD_SHORT))
                } else {
                    dispatch(setError(''))
                }
                break

            case 'confirmPassword':
                dispatch(setConfirmPassword(value))
                break

            default:
                break
        }
    }

    const handleOnSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        dispatch(setError(''))

        if (birthday === '') {
            dispatch(setError(BIRTHDAY_REQUIRED))
            return
        } else if (birthday.length < 8) {
            dispatch(setError(BIRTHDAY_COMPLETE))
            return
        }

        if (!identifier) {
            dispatch(setError(IDENTIFIER_REQUIRED))
            return
        } else if (!emailRegex.test(identifier) && !phoneRegex.test(identifier)) {
            dispatch(setError(IDENTIFIER_INVALID))
            return
        }

        if (!password) {
            dispatch(setError(PASSWORD_REQUIRED))
            return
        } else if (password.length < 4) {
            dispatch(setError(PASSWORD_SHORT))
            return
        }

        if (password !== confirmPassword) {
            dispatch(setError(PASSWORD_MISMATCH))
            return
        }

        if (!isChecked) {
            dispatch(setError(TERMS_REQUIRED))
            return
        }

        await register(identifier, password)
    }

    const debouncedSet = useDebounce(async (value: string) => {
        dispatch(setIdentifier(value))
    }, 500)

    const handleChangeInput = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value

        setLocalIdentifier(value)
        debouncedSet(value)
    }

    console.log('user: ', identifier, password)
    console.log('localStorage: ', localStorage.user)
    return (
        <div className={classNames(cls.Registration_form, {}, [className ?? ''])}>
            <form onSubmit={handleOnSubmit}>
                <Rows gap={20} rows={['auto']}>
                    <Rows gap={10} rows={['auto']}>
                        <Input
                            type='text'
                            placeholder='Дата рождения'
                            name='birthday'
                            onChange={handleChange}
                            onFocus={onFocusHandler}
                            value={isShowValue ? inputDateValue : birthday}
                            error={
                                error.includes(BIRTHDAY_REQUIRED) || error.includes(BIRTHDAY_COMPLETE) ?
                                    'Ошибка в дате рождения'
                                :   ''
                            }
                            className={classNames('auth_input_style', {
                                [cls.errorBorder]:
                                    error.includes(BIRTHDAY_REQUIRED) || error.includes(BIRTHDAY_COMPLETE)
                            })}
                        />
                        <Input
                            type='text'
                            placeholder='Введите номер или почту'
                            name='identifier'
                            onChange={handleChangeInput}
                            value={localIdentifier}
                            error={
                                error.includes(IDENTIFIER_REQUIRED) || error.includes(IDENTIFIER_INVALID) ?
                                    'Ошибка в дате рождения'
                                :   ''
                            }
                            className={classNames('auth_input_style', {
                                [cls.errorBorder]:
                                    error.includes(IDENTIFIER_REQUIRED) || error.includes(IDENTIFIER_INVALID)
                            })}
                        />
                        <Input
                            type='password'
                            placeholder='Введите пароль'
                            name='password'
                            onChange={handleChange}
                            value={password}
                            error={
                                error.includes(PASSWORD_REQUIRED) || error.includes(PASSWORD_MISMATCH) ?
                                    'Ошибка в дате рождения'
                                :   ''
                            }
                            className={classNames('auth_input_style', {
                                [cls.errorBorder]:
                                    error.includes(PASSWORD_REQUIRED) || error.includes(PASSWORD_MISMATCH)
                            })}
                        />
                        <Input
                            type='password'
                            placeholder='Подтвердите пароль'
                            name='confirmPassword'
                            onChange={handleChange}
                            value={confirmPassword}
                            error={
                                error.includes(PASSWORD_MISMATCH) || error.includes(PASSWORD_SHORT) ?
                                    'Ошибка в дате рождения'
                                :   ''
                            }
                            className={classNames('auth_input_style', {
                                [cls.errorBorder]: error.includes(PASSWORD_MISMATCH) || error.includes(PASSWORD_SHORT)
                            })}
                        />
                        <div className={cls.checkboxContainer}>
                            <Input
                                type='checkbox'
                                name='terms'
                                checked={isChecked}
                                onChange={e => dispatch(setIsChecked(e.target.checked))}
                            />
                            <label htmlFor='terms'>Я принимаю условия использования</label>
                        </div>

                        <Checkbox label='Checkbox' />

                        <Text className={cls.error}>{error}</Text>

                        <Btn
                            color='#0064FA'
                            disabled={
                                !identifier ||
                                !birthday ||
                                password.length < 4 ||
                                password !== confirmPassword ||
                                !isChecked
                            }>
                            Продолжить
                        </Btn>
                    </Rows>
                </Rows>
            </form>
        </div>
    )
}
