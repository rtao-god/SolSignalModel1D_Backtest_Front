import DeveloperContentPage from '@/pages/developerPages/ui/shared/DeveloperContentPage'
import { DEVELOPER_BACKEND_STRUCTURE_PAGE_CONFIG } from '@/pages/developerPages/ui/shared/developerBackendStructureContent'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './DeveloperBackendStructurePage.module.scss'
import type { DeveloperBackendStructurePageProps } from './types'

export default function DeveloperBackendStructurePage({ className }: DeveloperBackendStructurePageProps) {
    return (
        <DeveloperContentPage
            className={classNames(cls.DeveloperBackendStructurePage, {}, [className ?? ''])}
            config={DEVELOPER_BACKEND_STRUCTURE_PAGE_CONFIG}
        />
    )
}
