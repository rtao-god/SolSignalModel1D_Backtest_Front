
export interface PageTab {
    id: string
    label: string
    anchor: string // id секции на странице
}

export const BACKTEST_FULL_TABS: PageTab[] = [
    { id: 'baseline', label: 'Базовый профиль', anchor: 'baseline' },
    { id: 'whatif', label: 'Изменение конфигурации', anchor: 'whatif' },
    { id: 'compare', label: 'Сравнение профилей', anchor: 'compare' }
]

