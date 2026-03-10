import DeveloperContentPage from '@/pages/developerPages/ui/shared/DeveloperContentPage'
import { DEVELOPER_RUNTIME_FLOW_PAGE_CONFIG } from '@/pages/developerPages/ui/shared/developerRuntimeFlowContent'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './DeveloperRuntimeFlowPage.module.scss'
import type { DeveloperRuntimeFlowPageProps } from './types'

export default function DeveloperRuntimeFlowPage({ className }: DeveloperRuntimeFlowPageProps) {
    return (
        <DeveloperContentPage
            className={classNames(cls.DeveloperRuntimeFlowPage, {}, [className ?? ''])}
            config={DEVELOPER_RUNTIME_FLOW_PAGE_CONFIG}
        />
    )
}
