import classNames from '@/shared/lib/helpers/classNames'
import { Btn } from '@/shared/ui'
import cls from './ModelStatsPage.module.scss'
import type { ModelStatsModeToggleProps, SegmentKey, SegmentToggleProps } from './modelStatsTypes'

export function ModelStatsModeToggle({ mode, onChange }: ModelStatsModeToggleProps) {
    const handleBusinessClick = () => {
        if (mode !== 'business') {
            onChange('business')
        }
    }

    const handleTechnicalClick = () => {
        if (mode !== 'technical') {
            onChange('technical')
        }
    }

    return (
        <div className={cls.modeToggle}>
            <Btn
                size='sm'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'business' }, [])}
                onClick={handleBusinessClick}>
                Бизнес
            </Btn>
            <Btn
                size='sm'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'technical' }, [])}
                onClick={handleTechnicalClick}>
                Технарь
            </Btn>
        </div>
    )
}

export function SegmentToggle({ segments, value, onChange }: SegmentToggleProps) {
    if (!segments.length) {
        return null
    }

    const handleClick = (segment: SegmentKey) => () => {
        if (segment !== value) {
            onChange(segment)
        }
    }

    const renderLabel = (segment: SegmentKey) => {
        switch (segment) {
            case 'OOS':
                return 'OOS (честный)'
            case 'TRAIN':
                return 'Train'
            case 'FULL':
                return 'Full history'
            case 'RECENT':
                return 'Recent'
            default:
                return segment
        }
    }

    return (
        <div className={cls.modeToggle}>
            {segments.map(seg => (
                <Btn
                    key={seg.key}
                    size='sm'
                    className={classNames(cls.modeButton, { [cls.modeButtonActive]: value === seg.key }, [])}
                    onClick={handleClick(seg.key)}>
                    {renderLabel(seg.key)}
                </Btn>
            ))}
        </div>
    )
}
