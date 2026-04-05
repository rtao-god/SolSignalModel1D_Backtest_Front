export interface SummaryCardLine {
    label: string
    value: string
}

export interface SummaryCard {
    id: string
    title: string
    lines: SummaryCardLine[]
}

export interface BtcWeaknessProvidedTerm {
    key: string
    title: string
    description: string
    tooltip: string
}
