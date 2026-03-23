import classNames from '@/shared/lib/helpers/classNames'
import type BacktestPageProps from './types'
import { BacktestPageWithBoundary } from './backtestPage/BacktestPageWithBoundary/BacktestPageWithBoundary'
import cls from './BacktestPage.module.scss'

export default function BacktestPage(props: BacktestPageProps) {
    return (
        <div className={classNames(cls.BacktestPage, {}, [props.className ?? ''])}>
            <BacktestPageWithBoundary />
        </div>
    )
}
