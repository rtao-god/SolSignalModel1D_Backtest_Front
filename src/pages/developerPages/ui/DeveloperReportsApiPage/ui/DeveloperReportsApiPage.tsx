import DeveloperContentPage from '@/pages/developerPages/ui/shared/DeveloperContentPage'
import { DEVELOPER_REPORTS_API_PAGE_CONFIG } from '@/pages/developerPages/ui/shared/developerReportsApiContent'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './DeveloperReportsApiPage.module.scss'
import type { DeveloperReportsApiPageProps } from './types'

export default function DeveloperReportsApiPage({ className }: DeveloperReportsApiPageProps) {
    return (
        <DeveloperContentPage
            className={classNames(cls.DeveloperReportsApiPage, {}, [className ?? ''])}
            config={DEVELOPER_REPORTS_API_PAGE_CONFIG}
        />
    )
}
