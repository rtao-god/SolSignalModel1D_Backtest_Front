import classNames from '@/shared/lib/helpers/classNames'
import cls from './AuthSection.module.scss'
import AuthSectionProps from './types'
import { Link, Text } from '@/shared/ui'
import { useSelector } from 'react-redux'
import { getIsAuthenticated } from '../../model/getIsAuthenticated'
import LogoutBtn from '@/widgets/components/LogoutBtn/LogoutBtn'
import { useTranslation } from 'react-i18next'

export default function AuthSection({ className }: AuthSectionProps) {
    const isAuthenticated = useSelector(getIsAuthenticated)
    const { t } = useTranslation('auth')

    return (
        <div className={classNames(cls.Auth_section, {}, [className ?? ''])}>
            {isAuthenticated ?
                <LogoutBtn />
            :   <div className={cls.auth}>
                    <Link to='/login'>
                        <Text type='h2' variant='body-md' color='#0064FA'>
                            {t('section.login', { defaultValue: 'Sign in' })}
                        </Text>
                    </Link>
                    <Text color='#0064FA'>/</Text>
                    <Link to='/registration'>
                        <Text type='h2' variant='body-md' color='#0064FA'>
                            {t('section.registration', { defaultValue: 'Registration' })}
                        </Text>
                    </Link>
                </div>
            }
        </div>
    )
}
