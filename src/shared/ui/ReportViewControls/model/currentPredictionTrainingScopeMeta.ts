import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
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
        defaultHint: 'Train + OOS (main production mode)'
    },
    {
        value: 'train',
        labelKey: 'currentPrediction.scope.options.train.label',
        hintKey: 'currentPrediction.scope.options.train.hint',
        defaultLabel: 'Train-only',
        defaultHint: 'Train days only (baseline-exit <= split)'
    },
    {
        value: 'oos',
        labelKey: 'currentPrediction.scope.options.oos.label',
        hintKey: 'currentPrediction.scope.options.oos.hint',
        defaultLabel: 'OOS-only',
        defaultHint: 'OOS days only (baseline-exit > split)'
    },
    {
        value: 'recent',
        labelKey: 'currentPrediction.scope.options.recent.label',
        hintKey: 'currentPrediction.scope.options.recent.hint',
        defaultLabel: 'Recent tail',
        defaultHint: 'Latest rolling day window (configured on backend)'
    }
]

const TRAINING_SCOPE_META_BY_VALUE = new Map<CurrentPredictionTrainingScope, CurrentPredictionTrainingScopeOptionDef>(
    CURRENT_PREDICTION_TRAINING_SCOPE_OPTION_DEFS.map(option => [option.value, option])
)

/**
 * Возвращает label и hint для выбранного training scope в текущей локали интерфейса.
 */
export function resolveCurrentPredictionTrainingScopeMeta(
    scope: CurrentPredictionTrainingScope
): CurrentPredictionTrainingScopeMeta {
    const option = TRAINING_SCOPE_META_BY_VALUE.get(scope)
    if (!option) {
        throw new Error(`[ui] Unsupported current prediction training scope: ${scope}.`)
    }

    return {
        value: option.value,
        label: i18n.t(`reports:${option.labelKey}`, { defaultValue: option.defaultLabel }),
        hint: i18n.t(`reports:${option.hintKey}`, { defaultValue: option.defaultHint })
    }
}
