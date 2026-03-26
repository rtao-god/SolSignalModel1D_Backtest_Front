import classNames from '@/shared/lib/helpers/classNames'
import { BulletList } from '@/shared/ui/BulletList'
import { Link } from '@/shared/ui/Link'
import { Text } from '@/shared/ui/Text'
import cls from './DomainOverview.module.scss'
import type { DomainOverviewProps } from './types'

/**
 * DomainOverview — общий верхний обзор для доменных home-страниц.
 *
 * Что делает:
 * - Держит один и тот же UX-паттерн для `/guide`, `/analysis` и `/diagnostics`: быстрый summary,
 *   таблицу "какой вопрос куда ведёт" и тематические блоки с переходами.
 *
 * Почему owner именно здесь:
 * - Проблема пустого top-block повторялась сразу на нескольких доменных страницах.
 *   Один reusable renderer дешевле и стабильнее, чем три расходящихся JSX-варианта.
 */
export default function DomainOverview({
    title,
    subtitle,
    metrics,
    factTable,
    blocks,
    className
}: DomainOverviewProps) {
    return (
        <section className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            <div className={cls.lead}>
                <Text type='h2' className={cls.title}>
                    {title}
                </Text>
                <Text className={cls.subtitle}>{subtitle}</Text>
            </div>

            {metrics && metrics.length > 0 && (
                <div className={cls.metricsGrid}>
                    {metrics.map(metric => (
                        <article key={metric.id} className={cls.metricCard}>
                            <Text className={cls.metricLabel}>{metric.label}</Text>
                            <Text type='h3' className={cls.metricValue}>
                                {metric.value}
                            </Text>
                        </article>
                    ))}
                </div>
            )}

            {factTable && (
                <article className={cls.factCard}>
                    <Text type='h3' className={cls.factTitle}>
                        {factTable.title}
                    </Text>

                    <div className={cls.tableScroll}>
                        <table className={cls.factTable}>
                            <thead>
                                <tr>
                                    <th>{factTable.columns.question}</th>
                                    <th>{factTable.columns.answer}</th>
                                    <th>{factTable.columns.details}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {factTable.rows.map(row => (
                                    <tr key={row.id}>
                                        <th scope='row'>{row.question}</th>
                                        <td>{row.answer}</td>
                                        <td>
                                            <div className={cls.linkRow}>
                                                {row.links.map(link => (
                                                    <Link
                                                        key={`${row.id}-${link.id}`}
                                                        to={link.to}
                                                        className={cls.linkPill}
                                                        onMouseEnter={link.onWarmup}
                                                        onFocus={link.onWarmup}>
                                                        {link.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>
            )}

            <div className={cls.blocksGrid}>
                {blocks.map(block => (
                    <article key={block.id} className={cls.blockCard}>
                        <Text type='h3' className={cls.blockTitle}>
                            {block.title}
                        </Text>

                        {block.bullets && block.bullets.length > 0 && (
                            <BulletList
                                className={cls.bulletList}
                                itemClassName={cls.bulletItem}
                                contentClassName={cls.bulletContent}
                                items={block.bullets.map((bullet, index) => ({
                                    key: `${block.id}-bullet-${index}`,
                                    content: bullet
                                }))}
                            />
                        )}

                        {block.steps && block.steps.length > 0 && (
                            <div className={cls.stepList}>
                                {block.steps.map((step, index) => (
                                    <div key={`${block.id}-step-${index}`} className={cls.stepItem}>
                                        <span className={cls.stepIndex}>{index + 1})</span>
                                        <Text className={cls.stepText}>{step}</Text>
                                    </div>
                                ))}
                            </div>
                        )}

                        {block.table && (
                            <div className={cls.inlineTableShell}>
                                <Text type='h4' className={cls.inlineTableTitle}>
                                    {block.table.title}
                                </Text>
                                <div className={cls.inlineTableScroll}>
                                    <table className={cls.inlineTable}>
                                        <thead>
                                            <tr>
                                                {block.table.columns.map((column, index) => (
                                                    <th key={`${block.id}-column-${index}`}>{column}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {block.table.rows.map(row => (
                                                <tr key={row.id}>
                                                    <th scope='row'>{row.header}</th>
                                                    {row.cells.map((cell, cellIndex) => (
                                                        <td key={`${row.id}-cell-${cellIndex}`}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className={cls.linkRow}>
                            {block.links.map(link => (
                                <Link
                                    key={`${block.id}-${link.id}`}
                                    to={link.to}
                                    className={cls.linkPill}
                                    onMouseEnter={link.onWarmup}
                                    onFocus={link.onWarmup}>
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}
