import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { ReactNode, useMemo } from 'react'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import type { ReportDocumentDto, TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import { resolveBacktestDiagnosticsDescription } from '@/shared/utils/backtestDiagnosticsDescriptions'
import cls from './BacktestDiagnosticsPageLayout.module.scss'

interface BacktestDiagnosticsPageLayoutProps {
    report: ReportDocumentDto
    sections: TableSectionDto[]
    pageTitle: string
    pageSubtitle: string
    emptyMessage: string
    className?: string
    renderColumnTitle?: (title: string, colIdx: number) => ReactNode
}

function formatUtc(dt: Date): string {
    const year = dt.getUTCFullYear()
    const month = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const day = String(dt.getUTCDate()).padStart(2, '0')
    const hour = String(dt.getUTCHours()).padStart(2, '0')
    const minute = String(dt.getUTCMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute} UTC`
}

function normalizeReportTitle(title: string | undefined): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}

function sectionDomId(index: number): string {
    return `diag-section-${index + 1}`
}

export default function BacktestDiagnosticsPageLayout({
    report,
    sections,
    pageTitle,
    pageSubtitle,
    emptyMessage,
    className,
    renderColumnTitle
}: BacktestDiagnosticsPageLayoutProps) {
    const generatedUtc = report.generatedAtUtc ? new Date(report.generatedAtUtc) : null

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    const pagerSections = useMemo(
        () =>
            sections.map((section, index) => ({
                id: sectionDomId(index),
                anchor: sectionDomId(index),
                label: normalizeReportTitle(section.title) || section.title || `Секция ${index + 1}`
            })),
        [sections]
    )

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pagerSections,
        syncHash: true
    })

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div>
                    <Text type='h1'>{pageTitle}</Text>
                    <Text className={cls.subtitle}>{pageSubtitle}</Text>
                </div>

                <div className={cls.meta}>
                    <Text>Report: {report.title}</Text>
                    <Text>Kind: {report.kind}</Text>
                    <Text>Generated (UTC): {generatedUtc ? formatUtc(generatedUtc) : '—'}</Text>
                    <Text>Generated (local): {generatedUtc ? generatedUtc.toLocaleString() : '—'}</Text>
                </div>
            </header>

            {sections.length === 0 ? (
                <Text>{emptyMessage}</Text>
            ) : (
                <>
                    <div className={cls.tableGrid}>
                        {sections.map((section, index) => (
                            <ReportTableCard
                                key={`${section.title}-${index}`}
                                title={normalizeReportTitle(section.title) || section.title || `Секция ${index + 1}`}
                                description={resolveBacktestDiagnosticsDescription(section.title) ?? undefined}
                                columns={section.columns ?? []}
                                rows={section.rows ?? []}
                                domId={sectionDomId(index)}
                                renderColumnTitle={renderColumnTitle}
                            />
                        ))}
                    </div>

                    {pagerSections.length > 1 && (
                        <SectionPager
                            sections={pagerSections}
                            currentIndex={currentIndex}
                            canPrev={canPrev}
                            canNext={canNext}
                            onPrev={handlePrev}
                            onNext={handleNext}
                        />
                    )}
                </>
            )}
        </div>
    )
}
