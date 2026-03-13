import type { ReactNode } from 'react'

export interface DomainOverviewMetric {
    id: string
    label: string
    value: string
}

export interface DomainOverviewLink {
    id: string
    label: string
    to: string
    onWarmup?: () => void
}

export interface DomainOverviewFactRow {
    id: string
    question: ReactNode
    answer: ReactNode
    links: readonly DomainOverviewLink[]
}

export interface DomainOverviewTableRow {
    id: string
    header: ReactNode
    cells: readonly ReactNode[]
}

export interface DomainOverviewInlineTable {
    title: string
    columns: readonly string[]
    rows: readonly DomainOverviewTableRow[]
}

export interface DomainOverviewBlock {
    id: string
    title: string
    bullets?: readonly ReactNode[]
    steps?: readonly ReactNode[]
    links: readonly DomainOverviewLink[]
    table?: DomainOverviewInlineTable
}

export interface DomainOverviewProps {
    title: string
    subtitle: ReactNode
    metrics?: readonly DomainOverviewMetric[]
    factTable?: {
        title: string
        columns: {
            question: string
            answer: string
            details: string
        }
        rows: readonly DomainOverviewFactRow[]
    }
    blocks: readonly DomainOverviewBlock[]
    className?: string
}
