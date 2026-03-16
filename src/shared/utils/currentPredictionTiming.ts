import type { KeyValueSectionDto, ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'

const PREVIEW_STATUS_ITEM_KEY = 'preview_status'
const TIMING_ENTRY_KEYS = new Set(['entryutc', 'времявхода(utc)'])
const TIMING_EXIT_KEYS = new Set(['exitutc', 'времявыхода(utc)'])
const TIMING_PREDICTION_DATE_KEYS = new Set(['predictiondate(utc)', 'датапрогноза(utc)'])

export interface CurrentPredictionTimingSnapshot {
    generatedAtUtc: string
    predictionDateUtc: string | null
    entryUtc: string | null
    exitUtc: string | null
    previewStatusRaw: string | null
}

export interface CurrentPredictionTimingStatus {
    text: string
    tone: 'neutral' | 'healthy' | 'warning'
}

export type CurrentPredictionTimingPhase = 'incomplete' | 'before_entry' | 'active' | 'closed'

function normalizeLookupKey(value: string | undefined | null): string {
    return (value ?? '').replace(/\s+/g, '').trim().toLowerCase()
}

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

function parsePreviewField(rawValue: string, fieldName: string): string | null {
    const match = rawValue.match(new RegExp(`${fieldName}=([^,\\.\\s][^,]*)`, 'i'))
    return match?.[1]?.trim() ?? null
}

function parseReportTimingFields(report: ReportDocumentDto): {
    predictionDateUtc: string | null
    entryUtc: string | null
    exitUtc: string | null
    previewStatusRaw: string | null
} {
    let predictionDateUtc: string | null = null
    let entryUtc: string | null = null
    let exitUtc: string | null = null
    let previewStatusRaw: string | null = null

    for (const section of report.sections) {
        if (!isKeyValueSection(section) || !section.items) {
            continue
        }

        for (const item of section.items) {
            const itemKey = normalizeLookupKey(item.itemKey)
            const displayKey = normalizeLookupKey(item.key)
            const value = item.value.trim()

            if (!value) {
                continue
            }

            if (itemKey === PREVIEW_STATUS_ITEM_KEY) {
                previewStatusRaw = value
                continue
            }

            if (!predictionDateUtc && (TIMING_PREDICTION_DATE_KEYS.has(itemKey) || TIMING_PREDICTION_DATE_KEYS.has(displayKey))) {
                predictionDateUtc = value
                continue
            }

            if (!entryUtc && (TIMING_ENTRY_KEYS.has(itemKey) || TIMING_ENTRY_KEYS.has(displayKey))) {
                entryUtc = value
                continue
            }

            if (!exitUtc && (TIMING_EXIT_KEYS.has(itemKey) || TIMING_EXIT_KEYS.has(displayKey))) {
                exitUtc = value
            }
        }
    }

    if (!entryUtc && previewStatusRaw) {
        entryUtc = parsePreviewField(previewStatusRaw, 'sessionEntryUtc')
    }
    if (!exitUtc && previewStatusRaw) {
        exitUtc = parsePreviewField(previewStatusRaw, 'sessionExitUtc')
    }

    return {
        predictionDateUtc,
        entryUtc,
        exitUtc,
        previewStatusRaw
    }
}

export function resolveCurrentPredictionTimingSnapshot(
    report: ReportDocumentDto,
    fallbackPredictionDateUtc?: string | null
): CurrentPredictionTimingSnapshot {
    const parsed = parseReportTimingFields(report)

    return {
        generatedAtUtc: report.generatedAtUtc,
        predictionDateUtc: parsed.predictionDateUtc ?? fallbackPredictionDateUtc ?? null,
        entryUtc: parsed.entryUtc,
        exitUtc: parsed.exitUtc,
        previewStatusRaw: parsed.previewStatusRaw
    }
}

export function resolveCurrentPredictionTimingStatus(
    nowMs: number,
    timing: Pick<CurrentPredictionTimingSnapshot, 'entryUtc' | 'exitUtc'>,
    isRu: boolean
): CurrentPredictionTimingStatus {
    if (!timing.entryUtc || !timing.exitUtc) {
        return {
            text:
                isRu ?
                    'В отчёте пока нет полного окна времени для прогноза.'
                :   'The report does not yet contain a full timing window.',
            tone: 'warning'
        }
    }

    const entryMs = new Date(timing.entryUtc).getTime()
    const exitMs = new Date(timing.exitUtc).getTime()
    if (Number.isNaN(entryMs) || Number.isNaN(exitMs)) {
        throw new Error('[current-prediction] timing window contains invalid UTC values.')
    }

    if (nowMs < entryMs) {
        return {
            text:
                isRu ?
                    'Текущее действие: ожидание открытия торгового окна по этому прогнозу.'
                :   'Current action: waiting for the trading window to open for this forecast.',
            tone: 'healthy'
        }
    }

    if (nowMs < exitMs) {
        return {
            text:
                isRu ?
                    'Текущее действие: торговое окно уже идёт, до закрытия фактического дня работает обратный отсчёт.'
                :   'Current action: the trading window is active and the countdown now tracks the factual day close.',
            tone: 'healthy'
        }
    }

    return {
        text:
            isRu ?
                'Текущее действие: окно факта уже закрыто, дальше важен следующий пересчёт прогноза.'
            :   'Current action: the factual window is already closed, so the next report rebuild becomes the next relevant event.',
        tone: 'neutral'
    }
}

export function resolveCurrentPredictionTimingPhase(
    nowMs: number,
    timing: Pick<CurrentPredictionTimingSnapshot, 'entryUtc' | 'exitUtc'>
): CurrentPredictionTimingPhase {
    if (!timing.entryUtc || !timing.exitUtc) {
        return 'incomplete'
    }

    const entryMs = new Date(timing.entryUtc).getTime()
    const exitMs = new Date(timing.exitUtc).getTime()
    if (Number.isNaN(entryMs) || Number.isNaN(exitMs)) {
        throw new Error('[current-prediction] timing window contains invalid UTC values.')
    }

    if (nowMs < entryMs) {
        return 'before_entry'
    }

    if (nowMs < exitMs) {
        return 'active'
    }

    return 'closed'
}

export function resolveCurrentPredictionHistoryTimingStatus(
    timing: Pick<CurrentPredictionTimingSnapshot, 'entryUtc' | 'exitUtc'>,
    isRu: boolean
): CurrentPredictionTimingStatus {
    if (!timing.entryUtc || !timing.exitUtc) {
        return {
            text:
                isRu ?
                    'В архивном отчёте нет полного окна времени для этого исторического дня.'
                :   'The archived report does not contain a complete timing window for this historical day.',
            tone: 'warning'
        }
    }

    return {
        text:
            isRu ?
                'Архивный отчёт показывает зафиксированные времена исторического дня. Обратный отсчёт здесь не используется.'
            :   'The archived report shows fixed timestamps for the historical day. No live countdown is used here.',
        tone: 'neutral'
    }
}
