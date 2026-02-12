import classNames from '@/shared/lib/helpers/classNames'
import { Btn } from '@/shared/ui/Btn'
import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import cls from './CurrentPredictionTrainingScopeToggle.module.scss'

export interface CurrentPredictionTrainingScopeMeta {
    value: CurrentPredictionTrainingScope
    label: string
    hint: string
}

export const CURRENT_PREDICTION_TRAINING_SCOPE_OPTIONS: readonly CurrentPredictionTrainingScopeMeta[] = [
    {
        value: 'full',
        label: 'Полная история',
        hint: 'Train + OOS (основной боевой режим)'
    },
    {
        value: 'train',
        label: 'Train-only',
        hint: 'Только train-дни (baseline-exit <= split)'
    },
    {
        value: 'oos',
        label: 'OOS-only',
        hint: 'Только OOS-дни (baseline-exit > split)'
    },
    {
        value: 'recent',
        label: 'Хвост истории',
        hint: 'Последнее окно дней (на бэкенде настраивается)'
    }
]

const SCOPE_META_BY_VALUE = new Map<CurrentPredictionTrainingScope, CurrentPredictionTrainingScopeMeta>(
    CURRENT_PREDICTION_TRAINING_SCOPE_OPTIONS.map(meta => [meta.value, meta])
)

export function resolveCurrentPredictionTrainingScopeMeta(
    scope: CurrentPredictionTrainingScope
): CurrentPredictionTrainingScopeMeta {
    const meta = SCOPE_META_BY_VALUE.get(scope)
    if (!meta) {
        throw new Error(`[ui] Unsupported current prediction training scope: ${scope}.`)
    }

    return meta
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
    if (!SCOPE_META_BY_VALUE.has(value)) {
        throw new Error(`[ui] Unsupported current prediction training scope toggle value: ${value}.`)
    }

    return (
        <div
            className={classNames(cls.CurrentPredictionTrainingScopeToggle, {}, [className ?? ''])}
            role='tablist'
            aria-label={ariaLabel ?? 'Режим обучения модели'}>
            {CURRENT_PREDICTION_TRAINING_SCOPE_OPTIONS.map(option => (
                <Btn
                    key={option.value}
                    size='sm'
                    className={classNames(
                        cls.optionButton,
                        { [cls.optionButtonActive]: option.value === value },
                        []
                    )}
                    onClick={() => {
                        if (option.value !== value) {
                            onChange(option.value)
                        }
                    }}
                    role='tab'
                    aria-selected={option.value === value}>
                    {option.label}
                </Btn>
            ))}
        </div>
    )
}

