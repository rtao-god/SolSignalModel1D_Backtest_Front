import cls from './Navbar.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import NavbarProps from './types'
import { LangSwitcher } from '@/widgets/components'
import { Link, Input, AuthSection } from '@/shared/ui'
import { useTheme } from '@/shared/lib/hooks'
import { BugBtn } from '@/app/providers'

export default function Navbar({ className }: NavbarProps) {
    const { toggleTheme } = useTheme()

    const handleToggle = () => {
        toggleTheme()
    }

    return (
        <div className={classNames(cls.Navbar, {}, [className ?? ''])}>
            <div className={cls.controls}>
                <LangSwitcher />
                <BugBtn />
                <label className={cls.switch}>
                    <Input type='checkbox' />
                    <span onClick={handleToggle} className={`${cls.slider} ${cls.slider_red}`}></span>
                </label>
            </div>
            <div className={cls.links}>
                <Link to='/'>MainPage</Link>
                <Link to='/profile'>Profile</Link>
                <Link to='/about'>AboutPage</Link>
                <AuthSection />
            </div>
        </div>
    )
}
