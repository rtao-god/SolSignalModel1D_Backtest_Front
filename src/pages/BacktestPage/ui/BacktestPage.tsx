import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'
import type BacktestPageProps from './types'
import { BacktestPageWithBoundary } from './BacktestPageWithBoundary'

/*
	BacktestPage — внешний экспорт страницы полного бэктеста.

	Зачем:
		- Оборачивает boundary-слой в PageSuspense для корректной работы Suspense.

	Контракты:
		- BacktestPageWithBoundary отвечает за загрузку данных и обработку ошибок.

	Public API:
		- default export: BacktestPage
*/
export default function BacktestPage(props: BacktestPageProps) {
    return (
        <PageSuspense title='Загружаю baseline-сводку и профили бэктеста…'>
            <BacktestPageWithBoundary {...props} />
        </PageSuspense>
    )
}
