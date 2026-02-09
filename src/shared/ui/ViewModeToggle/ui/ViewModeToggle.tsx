import classNames from '@/shared/lib/helpers/classNames'
import { Btn } from '@/shared/ui/Btn'
import cls from './ViewModeToggle.module.scss'

export type ViewMode = 'business' | 'technical'

interface ViewModeToggleProps {
    mode: ViewMode
    onChange: (mode: ViewMode) => void
    className?: string
    labels?: {
        business: string
        technical: string
    }
}

export function ViewModeToggle({ mode, onChange, className, labels }: ViewModeToggleProps) {
    const handleChange = (next: ViewMode) => {
        if (next !== mode) {
            onChange(next)
        }
    }

    const businessLabel = labels?.business ?? 'Бизнес'
    const technicalLabel = labels?.technical ?? 'Технарь'

    return (
        <div className={classNames(cls.ViewModeToggle, {}, [className ?? ''])}>
            <Btn
                size='sm'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'business' }, [])}
                onClick={() => handleChange('business')}>
                {businessLabel}
            </Btn>
            <Btn
                size='sm'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'technical' }, [])}
                onClick={() => handleChange('technical')}>
                {technicalLabel}
            </Btn>
        </div>
    )
}

