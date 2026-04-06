import type { ReactNode } from 'react'
import SectionDataState, { type SectionDataStateProps } from '@/shared/ui/errors/SectionDataState/ui/SectionDataState'

interface PageDataStateProps extends Omit<SectionDataStateProps, 'children'> {
    shell: ReactNode
    children: ReactNode
}

function PageDataStateRoot({ shell, children, ...stateProps }: PageDataStateProps) {
    return (
        <>
            {shell}
            <SectionDataState {...stateProps}>{children}</SectionDataState>
        </>
    )
}

// Route shell живёт вне data-boundary всегда. Так page-level fetch error не может физически стереть заголовок,
// фильтры или другой статичный каркас страницы. Для локальных section-boundary есть отдельный export ниже.
const PageDataState = PageDataStateRoot
const PageSectionDataState = SectionDataState

export default PageDataState
export { PageDataState, PageSectionDataState }
export type { PageDataStateProps }
