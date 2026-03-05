import classNames from '@/shared/lib/helpers/classNames'
import { Btn } from '@/shared/ui/Btn'
import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import { useTranslation } from 'react-i18next'
import i18n from '@/shared/configs/i18n/i18n'
import cls from './CurrentPredictionTrainingScopeToggle.module.scss'

export interface CurrentPredictionTrainingScopeMeta {
    value: CurrentPredictionTrainingScope
    label: string
    hint: string
}

interface CurrentPredictionTrainingScopeOption {
    value: CurrentPredictionTrainingScope
    labelKey: string
    hintKey: string
    defaultLabel: string
    defaultHint: string
}

export const CURRENT_PREDICTION_TRAINING_SCOPE_OPTIONS: readonly CurrentPredictionTrainingScopeOption[] = [
    {
        value: 'full',
        labelKey: 'currentPrediction.scope.options.full.label',
        hintKey: 'currentPrediction.scope.options.full.hint',
        defaultLabel: 'Полная история',
        defaultHint: 'Train + OOS (основной боевой режим)'
    },
    {
        value: 'train',
        labelKey: 'currentPrediction.scope.options.train.label',
        hintKey: 'currentPrediction.scope.options.train.hint',
        defaultLabel: 'Train-only',
        defaultHint: 'Только train-дни (baseline-exit <= split)'
    },
    {
        value: 'oos',
        labelKey: 'currentPrediction.scope.options.oos.label',
        hintKey: 'currentPrediction.scope.options.oos.hint',
        defaultLabel: 'OOS-only',
        defaultHint: 'Только OOS-дни (baseline-exit > split)'
    },
    {
        value: 'recent',
        labelKey: 'currentPrediction.scope.options.recent.label',
        hintKey: 'currentPrediction.scope.options.recent.hint',
        defaultLabel: 'Хвост истории',
        defaultHint: 'Последнее окно дней (на бэкенде настраивается)'
    }
]

const SCOPE_META_BY_VALUE = new Map<CurrentPredictionTrainingScope, CurrentPredictionTrainingScopeOption>(
    CURRENT_PREDICTION_TRAINING_SCOPE_OPTIONS.map(meta => [meta.value, meta])
)

export function resolveCurrentPredictionTrainingScopeMeta(
    scope: CurrentPredictionTrainingScope
): CurrentPredictionTrainingScopeMeta {
    const option = SCOPE_META_BY_VALUE.get(scope)
    if (!option) {
        throw new Error(`[ui] Unsupported current prediction training scope: ${scope}.`)
    }

    return {
        value: option.value,
        label: i18n.t(`reports:${option.labelKey}`, { defaultValue: option.defaultLabel }),
        hint: i18n.t(`reports:${option.hintKey}`, { defaultValue: option.defaultHint })
    }
}

interface CurrentPredictionTrainingScopeToggleProps {
    value: CurrentPredictionTrainingScope
    onChange: (value: CurrentPredictionTrainingScope) => void
    className?: string
    ariaLabel?: string
}

export function CurrentPredictionTrainingScopeToggle({
    value,
    onChange,
    className,
    ariaLabel
}: CurrentPredictionTrainingScopeToggleProps) {
    const { t } = useTranslation('reports')

    if (!SCOPE_META_BY_VALUE.has(value)) {
        throw new Error(`[ui] Unsupported current prediction training scope toggle value: ${value}.`)
    }

    return (
        <div
            className={classNames(cls.CurrentPredictionTrainingScopeToggle, {}, [className ?? ''])}
            role='tablist'
            aria-label={ariaLabel ?? t('currentPrediction.scope.ariaLabel')}>
            {CURRENT_PREDICTION_TRAINING_SCOPE_OPTIONS.map(option => (
                <Btn
                    key={option.value}
                    size='sm'
                    className={classNames(cls.optionButton, { [cls.optionButtonActive]: option.value === value }, [])}
                    onClick={() => {
                        if (option.value !== value) {
                            onChange(option.value)
                        }
                    }}
                    role='tab'
                    aria-selected={option.value === value}>
                    {resolveCurrentPredictionTrainingScopeMeta(option.value).label}
                </Btn>
            ))}
        </div>
    )
}
