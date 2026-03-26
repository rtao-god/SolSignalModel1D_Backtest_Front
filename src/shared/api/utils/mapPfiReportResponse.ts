import type {
    PfiReportDocumentDto,
    PfiReportFamilyKeyDto,
    PfiReportKindDto,
    PfiReportSectionDto,
    PfiScoreScopeKeyDto
} from '@/shared/types/pfi.types'

function toObject(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an object.`)
    }

    return value as Record<string, unknown>
}

function toRequiredString(value: unknown, label: string): string {
    if (typeof value !== 'string') {
        throw new Error(`[ui] ${label} must be a string.`)
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error(`[ui] ${label} must be non-empty.`)
    }

    return normalized
}

function toOptionalString(value: unknown): string | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    if (typeof value !== 'string') {
        throw new Error('[ui] optional PFI string field must be a string when provided.')
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

function toRequiredNumber(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`[ui] ${label} must be a finite number.`)
    }

    return value
}

function toStringArray(value: unknown, label: string): string[] {
    if (!Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an array.`)
    }

    return value.map((item, index) => toRequiredString(item, `${label}[${index}]`))
}

function toRows(value: unknown, label: string): string[][] {
    if (!Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an array.`)
    }

    return value.map((row, rowIndex) => toStringArray(row, `${label}[${rowIndex}]`))
}

function parsePfiKind(value: unknown, label: string): PfiReportKindDto {
    const kind = toRequiredString(value, label)
    if (kind === 'pfi_per_model' || kind === 'pfi_sl_model') {
        return kind
    }

    throw new Error(`[ui] ${label} has unsupported value: ${kind}.`)
}

function parsePfiFamily(value: unknown, label: string): PfiReportFamilyKeyDto {
    const family = toRequiredString(value, label)
    if (family === 'daily_model' || family === 'sl_model') {
        return family
    }

    throw new Error(`[ui] ${label} has unsupported value: ${family}.`)
}

function parsePfiScoreScope(value: unknown, label: string): PfiScoreScopeKeyDto {
    const scope = toRequiredString(value, label)
    if (scope === 'train_oof' || scope === 'oos' || scope === 'train' || scope === 'full_history') {
        return scope
    }

    throw new Error(`[ui] ${label} has unsupported value: ${scope}.`)
}

function mapPfiReportSectionResponse(raw: unknown, index: number): PfiReportSectionDto {
    const payload = toObject(raw, `PfiReportSection[${index}]`)
    const columns = toStringArray(payload.columns, `PfiReportSection[${index}].columns`)
    const columnKeys = toStringArray(payload.columnKeys, `PfiReportSection[${index}].columnKeys`)

    if (columns.length !== columnKeys.length) {
        throw new Error(
            `[ui] PfiReportSection[${index}] columns/columnKeys length mismatch. columns=${columns.length}, columnKeys=${columnKeys.length}.`
        )
    }

    return {
        sectionKey: toRequiredString(payload.sectionKey, `PfiReportSection[${index}].sectionKey`),
        title: toRequiredString(payload.title, `PfiReportSection[${index}].title`),
        familyKey: parsePfiFamily(payload.familyKey, `PfiReportSection[${index}].familyKey`),
        modelKey: toRequiredString(payload.modelKey, `PfiReportSection[${index}].modelKey`),
        modelDisplayName: toRequiredString(payload.modelDisplayName, `PfiReportSection[${index}].modelDisplayName`),
        scoreScopeKey: parsePfiScoreScope(payload.scoreScopeKey, `PfiReportSection[${index}].scoreScopeKey`),
        featureSchemaKey: toRequiredString(payload.featureSchemaKey, `PfiReportSection[${index}].featureSchemaKey`),
        thresholdLabel: toOptionalString(payload.thresholdLabel),
        baselineAuc: toRequiredNumber(payload.baselineAuc, `PfiReportSection[${index}].baselineAuc`),
        columns,
        columnKeys,
        rows: toRows(payload.rows, `PfiReportSection[${index}].rows`)
    }
}

/**
 * Валидирует published PFI DTO и отсекает смешанные family-ответы ещё на клиентском transport-слое.
 */
export function mapPfiReportResponse(raw: unknown): PfiReportDocumentDto {
    const payload = toObject(raw, 'PfiReport')
    if (!Array.isArray(payload.sections)) {
        throw new Error('[ui] PfiReport.sections must be an array.')
    }

    const familyKey = parsePfiFamily(payload.familyKey, 'PfiReport.familyKey')
    const sections = payload.sections.map((section, index) => mapPfiReportSectionResponse(section, index))

    sections.forEach((section, index) => {
        if (section.familyKey !== familyKey) {
            throw new Error(
                `[ui] PfiReport.sections[${index}] family mismatch. expected=${familyKey}, actual=${section.familyKey}.`
            )
        }
    })

    return {
        id: toRequiredString(payload.id, 'PfiReport.id'),
        kind: parsePfiKind(payload.kind, 'PfiReport.kind'),
        title: toRequiredString(payload.title, 'PfiReport.title'),
        titleKey: toOptionalString(payload.titleKey),
        generatedAtUtc: toRequiredString(payload.generatedAtUtc, 'PfiReport.generatedAtUtc'),
        familyKey,
        trainUntilExitDayKeyUtc: toOptionalString(payload.trainUntilExitDayKeyUtc),
        sections
    }
}
