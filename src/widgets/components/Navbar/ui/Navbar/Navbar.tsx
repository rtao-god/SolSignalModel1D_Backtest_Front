import cls from './Navbar.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import NavbarProps from './types'
import { LangSwitcher } from '@/widgets/components'
import { Link, Input, AuthSection } from '@/shared/ui'
import { useTheme } from '@/shared/lib/hooks'
import { NAVBAR_ITEMS } from '@/app/providers/router/config/routeConfig'

export default function Navbar({ className }: NavbarProps) {
    const { toggleTheme } = useTheme()

    const handleToggle = () => {
        toggleTheme()
    }

    return (
        <div className={classNames(cls.Navbar, {}, [className ?? ''])}>
            <div className={cls.controls}>
                <LangSwitcher />
                <label className={cls.switch}>
                    <Input type='checkbox' />
                    <span onClick={handleToggle} className={`${cls.slider} ${cls.slider_red}`} />
                </label>
            </div>
            <div className={cls.links}>
                {NAVBAR_ITEMS.map(item => (
                    <Link key={item.id} to={item.path}>
                        {item.label}
                    </Link>
                ))}
                <AuthSection />
            </div>
        </div>
    )
}
