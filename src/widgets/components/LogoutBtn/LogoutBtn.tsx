import cls from './LogoutBtn.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import LogoutBtnProps from './types'
import { Btn, Text } from '@/shared/ui'

export default function LogoutBtn({ className }: LogoutBtnProps) {

    function handleLogout() {
        console.log()
        dispatch(userActions.logout())
    }
    return (
        <div className={classNames(cls.LogoutBtn, {}, [className ?? ''])}>
            <Btn onClick={handleLogout}>
                <Text type='p'> t{'Войти'} </Text>
            </Btn>
        </div>
    )
}
