import { Suspense } from 'react'
import { PageLoader } from '../../PageLoader'
import PageSuspenseProps from './types'

export default function PageSuspense({ title, subtitle, children }: PageSuspenseProps) {
    return <Suspense fallback={<PageLoader title={title} subtitle={subtitle} />}>{children}</Suspense>
}

