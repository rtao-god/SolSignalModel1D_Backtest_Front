import classNames from '@/shared/lib/helpers/classNames'
import cls from './AuthSection.module.scss'
import AuthSectionProps from './types'
import { Btn, Link, Text } from '@/shared/ui'
import { useDispatch, useSelector } from 'react-redux'
import { getIsAuthenticated } from '../../model/getIsAuthenticated'
import { userActions } from '@/entities/User'
import LogoutBtn from '@/widgets/components/LogoutBtn/LogoutBtn'

export default function AuthSection({ className }: AuthSectionProps) {
    const dispatch = useDispatch()
    const isAuthenticated = useSelector(getIsAuthenticated)
    // const logout = useLogout()
    // const { data, error, isLoading } = useGetDataQuery('/your-endpoint')

    // if (isLoading) return <div>Loading...</div>
    // if (error) return <div>Error: {error.message}</div>

    return (
        <div className={classNames(cls.Auth_section, {}, [className ?? ''])}>
            {isAuthenticated ?
                <LogoutBtn />
            :   <div className={cls.auth}>
                    <Link to='/login'>
                        <Text type='h2' fz='14px' color='#0064FA'>
                            Войти
                        </Text>
                    </Link>
                    <Text type='p' color='#0064FA'>
                        /
                    </Text>
                    <Link to='/registration'>
                        <Text type='h2' fz='14px' color='#0064FA'>
                            Регистрация
                        </Text>
                    </Link>
                </div>
            }
        </div>
    )
}
