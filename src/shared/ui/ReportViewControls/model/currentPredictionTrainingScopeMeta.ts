import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import type { CurrentPredictionBackfilledTrainingScopeStats } from '@/shared/api/tanstackQueries/currentPrediction'
import i18n from '@/shared/configs/i18n/i18n'

/**
 * UI-метаданные training scope для current prediction и связанных отчётных переключателей.
 */
export interface CurrentPredictionTrainingScopeMeta {
    value: CurrentPredictionTrainingScope
    label: string
    hint: string
}

interface CurrentPredictionTrainingScopeOptionDef {
    value: CurrentPredictionTrainingScope
    labelKey: string
    hintKey: string
    defaultLabel: string
    defaultHint: string
}

const CURRENT_PREDICTION_TRAINING_SCOPE_OPTION_DEFS: readonly CurrentPredictionTrainingScopeOptionDef[] = [
    {
        value: 'full',
        labelKey: 'currentPrediction.scope.options.full.label',
        hintKey: 'currentPrediction.scope.options.full.hint',
        defaultLabel: 'Full history',
        defaultHint: '100% completed history. The model is trained on the whole finished archive up to the last day whose outcome is already known.'
    },
    {
        value: 'train',
        labelKey: 'currentPrediction.scope.options.train.label',
        hintKey: 'currentPrediction.scope.options.train.hint',
        defaultLabel: 'Train diagnostics',
        defaultHint: 'Train diagnostics. In the base Train/OOS pair this is the earlier 70% of history before the 30% OOS tail.'
    },
    {
        value: 'oos',
        labelKey: 'currentPrediction.scope.options.oos.label',
        hintKey: 'currentPrediction.scope.options.oos.hint',
        defaultLabel: 'OOS evaluation',
        defaultHint: 'Base user OOS tail. The rule keeps the latest 30% of full history for OOS and leaves the earlier 70% in Train.'
    },
    {
        value: 'recent',
        labelKey: 'currentPrediction.scope.options.recent.label',
        hintKey: 'currentPrediction.scope.options.recent.hint',
        defaultLabel: 'Recent OOS tail',
        defaultHint: 'Short user OOS tail. The rule keeps the latest 15% of full history inside the wider 30% OOS tail.'
    }
]

const TRAINING_SCOPE_META_BY_VALUE = new Map<CurrentPredictionTrainingScope, CurrentPredictionTrainingScopeOptionDef>(
    CURRENT_PREDICTION_TRAINING_SCOPE_OPTION_DEFS.map(option => [option.value, option])
)

function formatTrainingScopeActualDays(days: number, locale: string): string {
    return new Intl.NumberFormat(locale).format(days)
}

function resolveRussianDayWord(days: number): string {
    const absValue = Math.abs(days) % 100
    const lastDigit = absValue % 10

    if (absValue >= 11 && absValue <= 19) {
        return 'дней'
    }

    if (lastDigit === 1) {
        return 'день'
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return 'дня'
    }

    return 'дней'
}

function buildTrainingScopeActualDaysHint(
    scope: CurrentPredictionTrainingScope,
    splitStats: CurrentPredictionBackfilledTrainingScopeStats,
    language: string
): string {
    const locale = language.toLowerCase().startsWith('ru') ? 'ru-RU' : 'en-US'
    const isRu = locale === 'ru-RU'
    const dayCount =
        scope === 'full' ? splitStats.fullDays
        : scope === 'train' ? splitStats.trainDays
        : scope === 'oos' ? splitStats.oosDays
        : splitStats.recentDays

    const formattedCount = formatTrainingScopeActualDays(dayCount, locale)

    if (!isRu) {
        return scope === 'recent' && splitStats.recentMatchesOos ?
                ` This currently contains ${formattedCount} days and fully matches the current OOS slice.`
            :   ` This currently contains ${formattedCount} days.`
    }

    const dayWord = resolveRussianDayWord(dayCount)

    return scope === 'recent' && splitStats.recentMatchesOos ?
            ` Сейчас это ${formattedCount} ${dayWord}, и сейчас этот хвост полностью совпадает с OOS.`
        :   ` Сейчас это ${formattedCount} ${dayWord}.`
}

/**
 * Возвращает label и hint для выбранного training scope в текущей локали интерфейса.
 */
export function resolveCurrentPredictionTrainingScopeMeta(
    scope: CurrentPredictionTrainingScope,
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
): CurrentPredictionTrainingScopeMeta {
    const option = TRAINING_SCOPE_META_BY_VALUE.get(scope)
    if (!option) {
        throw new Error(`[ui] Unsupported current prediction training scope: ${scope}.`)
    }

    const baseHint = i18n.t(`reports:${option.hintKey}`, { defaultValue: option.defaultHint })
    const hint =
        splitStats ? `${baseHint}${buildTrainingScopeActualDaysHint(scope, splitStats, i18n.language)}`
        : baseHint

    return {
        value: option.value,
        label: i18n.t(`reports:${option.labelKey}`, { defaultValue: option.defaultLabel }),
        hint
    }
}
