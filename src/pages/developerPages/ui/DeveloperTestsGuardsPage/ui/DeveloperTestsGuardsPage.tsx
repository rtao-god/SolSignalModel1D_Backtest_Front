import DeveloperContentPage from '@/pages/developerPages/ui/shared/DeveloperContentPage'
import { DEVELOPER_TESTS_GUARDS_PAGE_CONFIG } from '@/pages/developerPages/ui/shared/developerTestsGuardsContent'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './DeveloperTestsGuardsPage.module.scss'
import type { DeveloperTestsGuardsPageProps } from './types'

export default function DeveloperTestsGuardsPage({ className }: DeveloperTestsGuardsPageProps) {
    return (
        <DeveloperContentPage
            className={classNames(cls.DeveloperTestsGuardsPage, {}, [className ?? ''])}
            config={DEVELOPER_TESTS_GUARDS_PAGE_CONFIG}
        />
    )
}
