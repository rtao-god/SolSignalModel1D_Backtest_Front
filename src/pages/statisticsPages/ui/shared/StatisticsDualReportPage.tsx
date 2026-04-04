import type { UseQueryResult } from '@tanstack/react-query'
import classNames from '@/shared/lib/helpers/classNames'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import { ReportDocumentView, ReportTableTermsBlock, Text } from '@/shared/ui'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import type { StatisticsProvidedTerm, StatisticsSummaryCard } from './statisticsReportPageHelpers'
import cls from './StatisticsDualReportPage.module.scss'

interface StatisticsReportPane {
    title: string
    loadingText: string
    errorTitle: string
    errorMessage: string
    freshnessTitle: string
    freshnessMessage: string
    query: UseQueryResult<ReportDocumentDto, Error>
}

interface StatisticsDualReportPageProps {
    className?: string
    title: string
    subtitle: string
    summaryTitle: string
    summaryCards: StatisticsSummaryCard[]
    termsTitle: string
    termsSubtitle: string
    terms: StatisticsProvidedTerm[]
    backtest: StatisticsReportPane
    live: StatisticsReportPane
}

function renderReportPane(pane: StatisticsReportPane) {
    return (
        <section className={cls.block}>
            <Text type='h2' className={cls.blockTitle}>
                {pane.title}
            </Text>
            <SectionDataState
                hasData={Boolean(pane.query.data)}
                isLoading={pane.query.isLoading}
                isError={Boolean(pane.query.error)}
                error={pane.query.error ?? null}
                loadingText={pane.loadingText}
                title={pane.errorTitle}
                description={pane.errorMessage}
                onRetry={() => {
                    void pane.query.refetch()
                }}>
                {pane.query.data && (
                    <ReportDocumentView
                        report={pane.query.data}
                        freshness={{
                            statusMode: 'debug',
                            statusTitle: pane.freshnessTitle,
                            statusMessage: pane.freshnessMessage
                        }}
                        showTableTermsBlock={false}
                    />
                )}
            </SectionDataState>
        </section>
    )
}

// Общий layout для страниц статистики, которые одновременно читают historical report и factual live report.
// Так новые owner-страницы остаются в одном паттерне: summary, glossary, история, реальные дни.
export default function StatisticsDualReportPage({
    className,
    title,
    subtitle,
    summaryTitle,
    summaryCards,
    termsTitle,
    termsSubtitle,
    terms,
    backtest,
    live
}: StatisticsDualReportPageProps) {
    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            <section className={cls.hero}>
                <Text type='h1'>{title}</Text>
                <Text>{subtitle}</Text>
            </section>

            {summaryCards.length > 0 && (
                <section className={cls.block}>
                    <Text type='h2' className={cls.blockTitle}>
                        {summaryTitle}
                    </Text>
                    <div className={cls.summaryGrid}>
                        {summaryCards.map(card => (
                            <article key={card.id} className={cls.summaryCard}>
                                <Text className={cls.summaryTitle}>{card.title}</Text>
                                <div className={cls.summaryList}>
                                    {card.lines.map(line => (
                                        <div key={`${card.id}:${line.label}`} className={cls.summaryRow}>
                                            <span className={cls.summaryLabel}>{line.label}</span>
                                            <span className={cls.summaryValue}>{line.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <section className={cls.block}>
                <ReportTableTermsBlock
                    className={cls.termsBlock}
                    title={termsTitle}
                    subtitle={termsSubtitle}
                    terms={terms}
                    collapsible
                />
            </section>

            {renderReportPane(backtest)}
            {renderReportPane(live)}
        </div>
    )
}
