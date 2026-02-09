import classNames from '@/shared/lib/helpers/classNames'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'
import type BacktestPageProps from './types'
import { BacktestPageWithBoundary } from './backtestPage/BacktestPageWithBoundary/BacktestPageWithBoundary'
import cls from './BacktestPage.module.scss'

export default function BacktestPage(props: BacktestPageProps) {
    return (
        <div className={classNames(cls.BacktestPage, {}, [props.className ?? ''])}>
            <PageSuspense title='Загружаю baseline-сводку и профили бэктеста…'>
                <BacktestPageWithBoundary />
            </PageSuspense>
        </div>
    )
}
