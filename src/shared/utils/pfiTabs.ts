import type { TableSectionDto } from '@/shared/types/report.types'

export interface PfiTabConfig {
    id: string
    label: string
    anchor: string
}

/**
 * Вытаскивает "ядро" имени модели из заголовков вида:
 *
 * - "PFI по фичам: train:move (AUC=0,9976)"  →  "train:move"
 * - "PFI по фичам: oos:dir-down"             →  "oos:dir-down"
 * - "PFI по фичам: sl-train thr=0,030 (AUC=0,9777)" → "sl-train"
 * - "PFI по фичам: oos:move (AUC=0,6593)"    →  "oos:move"
 *
 * Всё, что до "PFI по фичам:" и после "thr=..." / "(AUC=...)" — отбрасывается.
 */
const PFI_TITLE_REGEX = /^PFI по фичам:\s*(.+?)(?:\s+thr=.*?)?(?:\s*\(AUC=.*?)?$/i

function extractModelLabelFromSectionTitle(title: string | null | undefined, index: number): string {
    if (!title) {
        return `Модель ${index + 1}`
    }

    const match = title.match(PFI_TITLE_REGEX)
    if (match && match[1]) {
        const normalized = match[1].trim()
        if (normalized.length > 0) {
            return normalized
        }
    }

    // Фолбэк на случай, если формат заголовка изменится
    // 1) убираем префикс "PFI по фичам:"
    let working = title.replace(/^PFI по фичам:\s*/i, '').trim()

    // 2) отрезаем всё после первой скобки (обычно там AUC/прочее)
    const parenIdx = working.indexOf('(')
    if (parenIdx >= 0) {
        working = working.slice(0, parenIdx).trim()
    }

    if (!working) {
        return `Модель ${index + 1}`
    }

    return working
}

/**
 * Собирает конфиг подвкладок PFI из секций отчёта:
 * - id / anchor стабильные (`pfi-model-{index+1}`) — не ломаем якоря;
 * - label аккуратно вырезан из section.title без "PFI по фичам" и "(AUC=...)".
 */
export function buildPfiTabsFromSections(sections: TableSectionDto[]): PfiTabConfig[] {
    return sections.map((section, index) => {
        const id = `pfi-model-${index + 1}`
        const anchor = id
        const label = extractModelLabelFromSectionTitle(section.title, index)

        return {
            id,
            label,
            anchor
        }
    })
}
