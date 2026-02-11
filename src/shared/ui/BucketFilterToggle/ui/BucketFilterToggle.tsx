import classNames from '@/shared/lib/helpers/classNames'
import { Btn } from '@/shared/ui/Btn'
import cls from './BucketFilterToggle.module.scss'

export interface BucketFilterOption {
    value: string
    label: string
}

interface BucketFilterToggleProps {
    value: string
    options: readonly BucketFilterOption[]
    onChange: (value: string) => void
    className?: string
    ariaLabel?: string
}

export function BucketFilterToggle({ value, options, onChange, className, ariaLabel }: BucketFilterToggleProps) {
    if (!Array.isArray(options) || options.length === 0) {
        throw new Error('[ui] BucketFilterToggle requires at least one option.')
    }

    const hasActiveValue = options.some(option => option.value === value)
    if (!hasActiveValue) {
        throw new Error(`[ui] BucketFilterToggle active value is missing in options. value=${value}.`)
    }

    const handleChange = (nextValue: string) => {
        if (nextValue !== value) {
            onChange(nextValue)
        }
    }

    return (
        <div
            className={classNames(cls.BucketFilterToggle, {}, [className ?? ''])}
            role='group'
            aria-label={ariaLabel ?? 'Фильтр по бакетам'}>
            {options.map(option => (
                <Btn
                    key={option.value}
                    size='sm'
                    className={classNames(cls.optionButton, { [cls.optionButtonActive]: option.value === value }, [])}
                    onClick={() => handleChange(option.value)}>
                    {option.label}
                </Btn>
            ))}
        </div>
    )
}

