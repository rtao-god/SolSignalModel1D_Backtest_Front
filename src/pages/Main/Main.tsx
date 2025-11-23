import cls from './Main.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import Layout from '../Layout/Layout'
import MainProps from './types'
import { PostsList } from '@/widgets/components'
import BacktestPage from '../BacktestPage/BacktestPage'
import CurrentMLModelPredictionPage from '../CurrentMLModelForecast/CurrentMLModelPredictionPage'
import BacktestSummaryReportPage from '../BacktestSummaryReport/ui/BacktestSummaryReportPage'

export default function Main({ className }: MainProps) {
    return (
        <Layout>
            {/* <CurrentMLModelPredictionPage /> */}
            <BacktestSummaryReportPage />
            <BacktestPage />
        </Layout>
    )
}

// TODO: Всем страницам добавить в конце названия Page
// TODO: Сделать открыание <CurrentMLModelPredictionPage /> и <BacktestPage /> при помощи кнопки 