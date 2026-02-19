import classNames from '@/shared/lib/helpers/classNames'
import { Btn } from '@/shared/ui/Btn'
import cls from './TpSlModeToggle.module.scss'

export type TpSlMode = 'all' | 'dynamic' | 'static'

interface TpSlModeOption {
    value: TpSlMode
    label: string
}

interface TpSlModeToggleProps {
    value: TpSlMode
    onChange: (value: TpSlMode) => void
    className?: string
    ariaLabel?: string
    options?: readonly TpSlModeOption[]
}

const DEFAULT_TP_SL_OPTIONS: readonly TpSlModeOption[] = [
    { value: 'all', label: 'ALL' },
    { value: 'dynamic', label: 'DYNAMIC TP/SL' },
    { value: 'static', label: 'STATIC TP/SL' }
]

const TP_SL_MODES = new Set<TpSlMode>(['all', 'dynamic', 'static'])

function isTpSlMode(value: string): value is TpSlMode {
    return TP_SL_MODES.has(value as TpSlMode)
}

export function TpSlModeToggle({
    value,
    onChange,
    className,
    ariaLabel,
    options = DEFAULT_TP_SL_OPTIONS
}: TpSlModeToggleProps) {
    if (!isTpSlMode(value)) {
        throw new Error(`[ui] Unsupported TP/SL mode value: ${value}.`)
    }

    if (!Array.isArray(options) || options.length === 0) {
        throw new Error('[ui] TpSlModeToggle requires at least one option.')
    }

    const optionValues = new Set<string>()
    for (let i = 0; i < options.length; i++) {
        const option = options[i]
        if (!option) {
            throw new Error(`[ui] TpSlModeToggle option at index ${i} is undefined.`)
        }
        if (!isTpSlMode(option.value)) {
            throw new Error(`[ui] TpSlModeToggle option has unsupported value: ${String(option.value)}.`)
        }
        if (optionValues.has(option.value)) {
            throw new Error(`[ui] TpSlModeToggle duplicate option value: ${option.value}.`)
        }
        optionValues.add(option.value)
    }

    if (!optionValues.has(value)) {
        throw new Error(`[ui] TpSlModeToggle active value is missing in options. value=${value}.`)
    }

    const handleChange = (nextValue: string) => {
        if (!isTpSlMode(nextValue)) {
            throw new Error(`[ui] Unsupported TP/SL mode option: ${nextValue}.`)
        }

        if (nextValue !== value) {
            onChange(nextValue)
        }
    }

    return (
        <div
            className={classNames(cls.TpSlModeToggle, {}, [className ?? ''])}
            role='group'
            aria-label={ariaLabel ?? 'Срез TP/SL'}>
            {options.map(option => (
                <Btn
                    key={option.value}
                    size='sm'
                    className={classNames(cls.optionButton, { [cls.optionButtonActive]: option.value === value }, [])}
                    onClick={() => handleChange(option.value)}
                    aria-pressed={option.value === value}>
                    {option.label}
                </Btn>
            ))}
        </div>
    )
}

