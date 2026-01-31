import { Suspense } from 'react'
import { PageLoader } from '../../PageLoader'
import PageSuspenseProps from './types'

/*
	Обёртка над React.Suspense для страниц.

	- На уровне маршрута показывает PageLoader с текстом.
	- Внутри children могут использовать useSuspenseQuery и другие suspense-источники.
*/
export default function PageSuspense({ title, subtitle, children }: PageSuspenseProps) {
    return <Suspense fallback={<PageLoader title={title} subtitle={subtitle} />}>{children}</Suspense>
}

