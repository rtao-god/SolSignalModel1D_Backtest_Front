import cls from './LogoutBtn.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import LogoutBtnProps from './types'
import { Btn, Text } from '@/shared/ui'
import { userActions } from '@/entities/User'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

export default function LogoutBtn({ className }: LogoutBtnProps) {
    const { t } = useTranslation('auth')

    const dispatch = useDispatch()
    function handleLogout() {
        dispatch(userActions.logout())
    }
    return (
        <div className={classNames(cls.LogoutBtn, {}, [className ?? ''])}>
            <Btn onClick={handleLogout}>
                <Text>{t('logout.button')}</Text>
            </Btn>
        </div>
    )
}
