import classNames from '@/shared/lib/helpers/classNames'
import { Btn } from '@/shared/ui'
import { useTranslation } from 'react-i18next'
import cls from './ModelStatsPage.module.scss'
import type { ModelStatsModeToggleProps, SegmentKey, SegmentToggleProps } from './modelStatsTypes'

export function ModelStatsModeToggle({ mode, onChange }: ModelStatsModeToggleProps) {
    const { t } = useTranslation()

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
                {t('common:viewMode.business')}
            </Btn>
            <Btn
                size='sm'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'technical' }, [])}
                onClick={handleTechnicalClick}>
                {t('common:viewMode.technical')}
            </Btn>
        </div>
    )
}

export function SegmentToggle({ segments, value, onChange }: SegmentToggleProps) {
    const { t } = useTranslation()

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
                return t('reports:modelStats.inner.segmentToggle.oos')
            case 'TRAIN':
                return t('reports:modelStats.inner.segmentToggle.train')
            case 'FULL':
                return t('reports:modelStats.inner.segmentToggle.full')
            case 'RECENT':
                return t('reports:modelStats.inner.segmentToggle.recent')
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
