import cls from './LogoutBtn.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import LogoutBtnProps from './types'
import { Btn, Text } from '@/shared/ui'
import { userActions } from '@/entities/User'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

export default function LogoutBtn({ className }: LogoutBtnProps) {
    const { t } = useTranslation('LogoutBtn')

    const dispatch = useDispatch()
    function handleLogout() {
        // console.log('userActions: ', dispatch(userActions))
        dispatch(userActions.logout())
    }
    return (
        <div className={classNames(cls.LogoutBtn, {}, [className ?? ''])}>
            <Btn onClick={handleLogout}>
                <Text> {t('Выйти')} </Text>
            </Btn>
        </div>
    )
}
