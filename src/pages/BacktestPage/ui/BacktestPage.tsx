import classNames from '@/shared/lib/helpers/classNames'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'
import type BacktestPageProps from './types'
import { BacktestPageWithBoundary } from './backtestPage/BacktestPageWithBoundary/BacktestPageWithBoundary'
import cls from './BacktestPage.module.scss'

/*
	BacktestPage — внешний экспорт страницы полного бэктеста.

	Зачем:
		- Оборачивает boundary-слой в PageSuspense для корректной работы Suspense.

	Контракты:
		- BacktestPageWithBoundary отвечает за загрузку данных и обработку ошибок.
*/
export default function BacktestPage(props: BacktestPageProps) {
    return (
        <div className={classNames(cls.BacktestPage, {}, [props.className ?? ''])}>
            <PageSuspense title='Загружаю baseline-сводку и профили бэктеста…'>
                <BacktestPageWithBoundary />
            </PageSuspense>
        </div>
    )
}
