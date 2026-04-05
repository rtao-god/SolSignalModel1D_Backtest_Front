import { useEffect, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui/Text'
import { formatDateWithLocale } from '@/shared/utils/dateFormat'
import cls from './ReportTimingSection.module.scss'

export interface ReportTimingRow {
    label: string
    value: string
}

export interface ReportTimingCardItem {
    id: string
    label: string
    targetUtc?: string | null
    displayValue?: string
    headline?: string
    rows?: ReportTimingRow[]
}

interface ReportTimingSectionProps {
    title: string
    subtitle?: string
    statusText?: string
    statusTone?: 'neutral' | 'healthy' | 'warning'
    cards: ReportTimingCardItem[]
    locale: string
    remainingLabel: string
    overdueLabel: string
    className?: string
    nowMs?: number
}

function parseUtcMs(value: string, context: string): number {
    const parsedMs = new Date(value).getTime()
    if (Number.isNaN(parsedMs)) {
        throw new Error(`[report-timing-section] invalid utc value for ${context}: ${value}.`)
    }

    return parsedMs
}

export function useReportTimingNowMs(): number {
    const [nowMs, setNowMs] = useState(() => Date.now())

    useEffect(() => {
        // Countdown обновляется локально, а UTC target остаётся каноничным источником времени из отчёта/API.
        const timerId = window.setInterval(() => {
            setNowMs(Date.now())
        }, 1000)

        return () => {
            window.clearInterval(timerId)
        }
    }, [])

    return nowMs
}

export function formatTimingUtc(value: string, locale: string): string {
    return formatDateWithLocale(parseUtcMs(value, 'formatTimingUtc'), locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    })
}

export function formatTimingExactUtc(value: string, locale: string): string {
    return `${formatTimingUtc(value, locale)} UTC`
}

export function formatTimingCountdown(
    targetUtc: string,
    nowMs: number,
    remainingLabel: string,
    overdueLabel: string
): string {
    const targetMs = parseUtcMs(targetUtc, 'formatTimingCountdown')
    const deltaMs = targetMs - nowMs
    const totalSeconds = Math.max(0, Math.floor(Math.abs(deltaMs) / 1000))
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const durationLabel = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`

    return deltaMs >= 0 ? `${durationLabel} ${remainingLabel}` : `${durationLabel} ${overdueLabel}`
}

export function ReportTimingSection({
    title,
    subtitle,
    statusText,
    statusTone = 'neutral',
    cards,
    locale: _locale,
    remainingLabel,
    overdueLabel,
    className,
    nowMs: nowMsProp
}: ReportTimingSectionProps) {
    const localNowMs = useReportTimingNowMs()
    const nowMs = nowMsProp ?? localNowMs

    return (
        <section className={classNames(cls.section, {}, [className ?? ''])}>
            <div className={cls.header}>
                <Text type='h2' className={cls.title}>
                    {title}
                </Text>
                {subtitle && <Text className={cls.subtitle}>{subtitle}</Text>}
            </div>
            {statusText && (
                <Text
                    className={classNames(cls.statusText, {
                        [cls.statusHealthy]: statusTone === 'healthy',
                        [cls.statusWarning]: statusTone === 'warning'
                    })}>
                    {statusText}
                </Text>
            )}
            <div className={cls.grid}>
                {cards.map(card => (
                    <article key={card.id} className={cls.card}>
                        <Text className={cls.rowLabel}>{card.label}</Text>
                        <Text type='h3' className={cls.countdown}>
                            {card.displayValue ?
                                card.displayValue
                            : card.targetUtc ?
                                formatTimingCountdown(card.targetUtc, nowMs, remainingLabel, overdueLabel)
                            :   (card.headline ?? '—')}
                        </Text>
                        {card.headline && !card.targetUtc && !card.displayValue && (
                            <Text className={cls.emptyDescription}>{card.headline}</Text>
                        )}
                        {card.rows && card.rows.length > 0 && (
                            <div className={cls.rows}>
                                {card.rows.map(row => (
                                    <div key={`${card.id}-${row.label}`} className={cls.row}>
                                        <Text className={cls.rowLabel}>{row.label}</Text>
                                        <Text className={cls.rowValue}>{row.value}</Text>
                                    </div>
                                ))}
                        </div>
                        )}
                    </article>
                ))}
            </div>
        </section>
    )
}
