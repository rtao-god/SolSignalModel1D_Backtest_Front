import type { TableSectionDto } from '@/shared/types/report.types'

/*
    policyBranchMegaTabs — утилиты вкладок для Policy Branch Mega.

    Зачем:
        - Держит стабильные якоря (#policy-branch-section-N).
        - Нормализует заголовки без декоративных ===.
*/

export interface PolicyBranchMegaTabConfig {
    id: string
    label: string
    anchor: string
}

// Убираем декоративные символы отчёта, чтобы заголовок читался на фронте.
export function normalizePolicyBranchMegaTitle(title: string | undefined): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}

// Пробуем вынуть номер части из заголовка "[PART 1/3]".
function extractPartNumber(title: string | undefined): number | null {
    if (!title) return null

    const normalized = normalizePolicyBranchMegaTitle(title)
    const partIndex = normalized.toLowerCase().indexOf('[part')
    if (partIndex < 0) return null

    const slashIndex = normalized.indexOf('/', partIndex)
    const endIndex = normalized.indexOf(']', partIndex)
    if (slashIndex < 0 || endIndex < 0 || slashIndex > endIndex) return null

    const numberStart = normalized.indexOf(' ', partIndex)
    if (numberStart < 0 || numberStart > slashIndex) return null

    const raw = normalized.slice(numberStart, slashIndex).trim()
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null

    return parsed
}

// Режим нужен, чтобы вкладки не смешивали WITH SL и NO SL.
function resolveModePrefix(title: string | undefined): string {
    if (!title) return ''

    const normalized = normalizePolicyBranchMegaTitle(title).toUpperCase()
    if (normalized.includes('NO SL')) return 'NO SL · '
    if (normalized.includes('WITH SL')) return 'WITH SL · '

    return ''
}

// Финальная подпись вкладки (если номер части распознан, используем его).
function resolvePartLabel(title: string | undefined, index: number): string {
    const part = extractPartNumber(title)
    const modePrefix = resolveModePrefix(title)
    if (part) {
        return `${modePrefix}Часть ${part}/3`
    }

    const normalized = normalizePolicyBranchMegaTitle(title)
    if (normalized) return `${modePrefix}${normalized}`

    return `${modePrefix}Секция ${index + 1}`
}

// Формируем вкладки/якоря по секциям отчёта.
export function buildPolicyBranchMegaTabsFromSections(sections: TableSectionDto[]): PolicyBranchMegaTabConfig[] {
    return sections.map((section, index) => {
        const id = `policy-branch-section-${index + 1}`
        const anchor = id
        const label = resolvePartLabel(section.title, index)

        return {
            id,
            label,
            anchor
        }
    })
}
