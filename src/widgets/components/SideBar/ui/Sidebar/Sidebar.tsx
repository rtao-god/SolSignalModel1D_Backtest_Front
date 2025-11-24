import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Link } from '@/shared/ui'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import cls from './Sidebar.module.scss'
import { sidebarNavItems, RouteSection } from '@/app/providers/router/config/routeConfig'

interface SidebarProps {
    className?: string
}

export default function AppSidebar({ className }: SidebarProps) {
    const { t } = useTranslation('')
    const [collapsed, setCollapsed] = useState(true)

    const onToggle = () => {
        setCollapsed(prev => !prev)
    }

    // Группируем пункты меню по секциям (root / ml / system)
    const grouped = useMemo(() => {
        const bySection = new Map<RouteSection | undefined, typeof sidebarNavItems>()
        sidebarNavItems.forEach(item => {
            const section = item.section
            const list = bySection.get(section) ?? []
            list.push(item)
            bySection.set(section, list)
        })
        return bySection
    }, [])

    const mlItems = grouped.get('ml') ?? []

    return (
        <div
            data-testid='sidebar'
            className={classNames(cls.Sidebar, { [cls.collapsed]: collapsed }, [className ?? ''])}>
            <Btn data-testid='sidebar-toggle' onClick={onToggle} size='medium' className={cls.burgerBtn}>
                <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    focusable='false'
                    style={{ pointerEvents: 'none', display: 'inherit' }}
                    aria-hidden='true'>
                    <path d='M21 6H3V5h18v1zm0 5H3v1h18v-1zm0 6H3v1h18v-1z'></path>
                </svg>
            </Btn>

            <div className={cls.links}>
                {/* ML-секция, если есть элементы */}
                {mlItems.length > 0 && (
                    <>
                        <div className={cls.sectionTitle}>{t('ML модель')}</div>
                        {mlItems.map(item => (
                            <Link key={item.id} to={item.path} className={cls.link}>
                                <span className={cls.linkBullet} />
                                <span className={cls.label}>{t(item.label)}</span>
                            </Link>
                        ))}
                    </>
                )}
            </div>
        </div>
    )
}
