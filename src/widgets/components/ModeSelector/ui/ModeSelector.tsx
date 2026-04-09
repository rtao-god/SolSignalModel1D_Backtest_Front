import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { ALL_MODES, selectActiveMode, setActiveMode, type ModeId } from '@/entities/mode'
import cls from './ModeSelector.module.scss'

function ModeSelector() {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const activeMode = useSelector(selectActiveMode)

    const handleModeChange = useCallback(
        (modeId: ModeId) => {
            dispatch(setActiveMode(modeId))
        },
        [dispatch]
    )

    return (
        <div className={cls.ModeSelector} role="tablist" aria-label={t('mode.selectorLabel', { defaultValue: 'Analysis Mode' })}>
            {ALL_MODES.map(mode => (
                <button
                    key={mode.id}
                    role="tab"
                    aria-selected={activeMode === mode.id}
                    className={`${cls.tab} ${activeMode === mode.id ? cls.active : ''}`.trim()}
                    onClick={() => handleModeChange(mode.id)}
                >
                    {mode.displayName}
                </button>
            ))}
        </div>
    )
}

export default memo(ModeSelector)
