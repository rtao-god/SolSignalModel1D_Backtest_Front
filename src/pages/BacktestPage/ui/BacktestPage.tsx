import classNames from '@/shared/lib/helpers/classNames'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'
import type BacktestPageProps from './types'
import { BacktestPageWithBoundary } from './backtestPage/BacktestPageWithBoundary/BacktestPageWithBoundary'
import { useTranslation } from 'react-i18next'
import cls from './BacktestPage.module.scss'

export default function BacktestPage(props: BacktestPageProps) {
    const { t } = useTranslation('common')

    return (
        <div className={classNames(cls.BacktestPage, {}, [props.className ?? ''])}>
            <PageSuspense title={t('loading.backtest_full')}>
                <BacktestPageWithBoundary />
            </PageSuspense>
        </div>
    )
}
