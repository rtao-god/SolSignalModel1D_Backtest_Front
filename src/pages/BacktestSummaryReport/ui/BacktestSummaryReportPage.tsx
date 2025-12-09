import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestSummaryReportPage.module.scss'
import { Text } from '@/shared/ui'
import type BacktestSummaryReportProps from '../types'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { resolveAppError } from '@/shared/lib/errors/resolveAppError'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { useBacktestBaselineSummaryReportQuery } from '@/shared/api/tanstackQueries/backtest'

export default function BacktestSummaryReportPage({ className }: BacktestSummaryReportProps) {
    const { data, isError, error } = useBacktestBaselineSummaryReportQuery()

    const rootClassName = classNames(cls.BacktestSummaryPage, {}, [className ?? ''])

    if (isError || !data) {
        const resolved = isError ? resolveAppError(error) : undefined

        return (
            <div className={rootClassName}>
                <ErrorBlock
                    code={resolved?.code ?? (isError ? 'UNKNOWN' : 'EMPTY')}
                    title={resolved?.title ?? 'Не удалось загрузить сводку бэктеста'}
                    description={
                        resolved?.description ??
                        'Проверьте, что бэкенд запущен и endpoint сводного baseline-отчёта отдаёт данные.'
                    }
                    details={resolved?.rawMessage}
                />
            </div>
        )
    }

    const generatedUtc = data.generatedAtUtc ? new Date(data.generatedAtUtc) : null
    const generatedUtcStr = generatedUtc ? generatedUtc.toISOString().replace('T', ' ').replace('Z', ' UTC') : '—'
    const generatedLocalStr = generatedUtc ? generatedUtc.toLocaleString() : '—'

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <Text type='h1'>{data.title}</Text>
                <Text>ID отчёта: {data.id}</Text>
                <Text>Тип: {data.kind}</Text>
                <Text>Сгенерировано (UTC): {generatedUtcStr}</Text>
                <Text>Сгенерировано (локальное время): {generatedLocalStr}</Text>
            </header>

            <div className={cls.sections}>
                <ReportDocumentView report={data} />
            </div>
        </div>
    )
}
