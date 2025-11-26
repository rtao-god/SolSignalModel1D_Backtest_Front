export interface PfiTabConfig {
    /** Логический id вкладки (внутренний идентификатор) */
    id: string
    /** Якорь/DOM id секции на странице (используется и в hash, и в scrollIntoView) */
    anchor: string
    /** Подпись подвкладки в сайдбаре */
    label: string
}

/**
 * Конфигурация подвкладок для страницы PFI:
 * порядок должен соответствовать порядку основных таблиц в PFI-отчёте.
 * При изменении набора моделей достаточно скорректировать этот список.
 */
export const PFI_TABS: PfiTabConfig[] = [
    {
        id: 'pfi-move',
        anchor: 'pfi-move',
        label: 'PFI: дневная модель (move)'
    },
    {
        id: 'pfi-dir',
        anchor: 'pfi-dir',
        label: 'PFI: модель направления (dir)'
    },
    {
        id: 'pfi-micro',
        anchor: 'pfi-micro',
        label: 'PFI: микро-слой'
    },
    {
        id: 'pfi-sl',
        anchor: 'pfi-sl',
        label: 'PFI: SL-модель'
    }
]
