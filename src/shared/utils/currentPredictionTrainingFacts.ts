import type { KeyValueSectionDto, ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'

export interface CurrentPredictionStructuredTrainingFacts {
    trainingScopeRange: string | null
    trainingRecipe: string | null
    predictionSemantics: string | null
    viewMode: string | null
    displaySliceMode: string | null
    isUserFacingHistory: string | null
    snapshotMaxLabeledDayKeyUtc: string | null
    trainWindowStartDayKeyUtc: string | null
    trainWindowEndDayKeyUtc: string | null
    fitWindowStartDayKeyUtc: string | null
    fitWindowEndDayKeyUtc: string | null
    scoreWindowStartDayKeyUtc: string | null
    scoreWindowEndDayKeyUtc: string | null
    scoreRowsPresenceInTrain: string | null
    recentTailDaySharePercent: number | null
    recentTailDaysReturned: number | null
}

const TRAINING_ITEM_KEYS = {
    trainingScopeRange: 'training_scope_range',
    trainingRecipe: 'training_recipe',
    predictionSemantics: 'prediction_semantics',
    viewMode: 'view_mode',
    displaySliceMode: 'display_slice_mode',
    isUserFacingHistory: 'is_user_facing_history',
    snapshotMaxLabeledDayKeyUtc: 'snapshot_max_labeled_day_key_utc',
    trainWindowStartDayKeyUtc: 'train_window_start_day_key_utc',
    trainWindowEndDayKeyUtc: 'train_window_end_day_key_utc',
    fitWindowStartDayKeyUtc: 'fit_window_start_day_key_utc',
    fitWindowEndDayKeyUtc: 'fit_window_end_day_key_utc',
    scoreWindowStartDayKeyUtc: 'score_window_start_day_key_utc',
    scoreWindowEndDayKeyUtc: 'score_window_end_day_key_utc',
    scoreRowsPresenceInTrain: 'score_rows_presence_in_train',
    recentTailDaySharePercent: 'recent_tail_day_share_percent',
    recentTailDaysReturned: 'recent_tail_days_returned'
} as const

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

function readTrainingValue(report: ReportDocumentDto | null | undefined, itemKey: string): string | null {
    if (!report?.sections) {
        return null
    }

    for (const section of report.sections) {
        if (!isKeyValueSection(section)) {
            continue
        }

        for (const item of section.items ?? []) {
            if (item?.itemKey === itemKey) {
                const value = item.value
                return typeof value === 'string' && value.trim().length > 0 ? value : null
            }
        }
    }

    return null
}

function readTrainingInteger(report: ReportDocumentDto | null | undefined, itemKey: string): number | null {
    const raw = readTrainingValue(report, itemKey)
    if (!raw) {
        return null
    }

    const parsed = Number.parseInt(raw, 10)
    return Number.isInteger(parsed) ? parsed : null
}

export function resolveCurrentPredictionStructuredTrainingFacts(
    report: ReportDocumentDto | null | undefined
): CurrentPredictionStructuredTrainingFacts | null {
    if (!report?.sections) {
        return null
    }

    return {
        trainingScopeRange: readTrainingValue(report, TRAINING_ITEM_KEYS.trainingScopeRange),
        trainingRecipe: readTrainingValue(report, TRAINING_ITEM_KEYS.trainingRecipe),
        predictionSemantics: readTrainingValue(report, TRAINING_ITEM_KEYS.predictionSemantics),
        viewMode: readTrainingValue(report, TRAINING_ITEM_KEYS.viewMode),
        displaySliceMode: readTrainingValue(report, TRAINING_ITEM_KEYS.displaySliceMode),
        isUserFacingHistory: readTrainingValue(report, TRAINING_ITEM_KEYS.isUserFacingHistory),
        snapshotMaxLabeledDayKeyUtc: readTrainingValue(report, TRAINING_ITEM_KEYS.snapshotMaxLabeledDayKeyUtc),
        trainWindowStartDayKeyUtc: readTrainingValue(report, TRAINING_ITEM_KEYS.trainWindowStartDayKeyUtc),
        trainWindowEndDayKeyUtc: readTrainingValue(report, TRAINING_ITEM_KEYS.trainWindowEndDayKeyUtc),
        fitWindowStartDayKeyUtc: readTrainingValue(report, TRAINING_ITEM_KEYS.fitWindowStartDayKeyUtc),
        fitWindowEndDayKeyUtc: readTrainingValue(report, TRAINING_ITEM_KEYS.fitWindowEndDayKeyUtc),
        scoreWindowStartDayKeyUtc: readTrainingValue(report, TRAINING_ITEM_KEYS.scoreWindowStartDayKeyUtc),
        scoreWindowEndDayKeyUtc: readTrainingValue(report, TRAINING_ITEM_KEYS.scoreWindowEndDayKeyUtc),
        scoreRowsPresenceInTrain: readTrainingValue(report, TRAINING_ITEM_KEYS.scoreRowsPresenceInTrain),
        recentTailDaySharePercent: readTrainingInteger(report, TRAINING_ITEM_KEYS.recentTailDaySharePercent),
        recentTailDaysReturned: readTrainingInteger(report, TRAINING_ITEM_KEYS.recentTailDaysReturned)
    }
}
