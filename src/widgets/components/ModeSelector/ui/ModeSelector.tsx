import { memo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { selectActiveMode, setActiveMode, type ModeId } from '@/entities/mode'
import { useModeRegistryQuery } from '@/shared/api/tanstackQueries/modeRegistry'
import cls from './ModeSelector.module.scss'

function ModeSelector() {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const activeMode = useSelector(selectActiveMode)
    const modeRegistryQuery = useModeRegistryQuery()

    const handleModeChange = useCallback(
        (modeId: ModeId) => {
            dispatch(setActiveMode(modeId))
        },
        [dispatch]
    )

    useEffect(() => {
        const registry = modeRegistryQuery.data
        if (!registry) {
            return
        }

        if (registry.modes.some(mode => mode.id === activeMode)) {
            return
        }

        const fallbackMode = registry.modes.find(mode => mode.isDefault)?.id ?? registry.modes[0]?.id
        if (fallbackMode) {
            dispatch(setActiveMode(fallbackMode))
        }
    }, [activeMode, dispatch, modeRegistryQuery.data])

    if (modeRegistryQuery.isLoading && !modeRegistryQuery.data) {
        return (
            <div className={cls.ModeSelectorStatus} aria-live='polite'>
                {t('mode.selectorLoading', { defaultValue: 'Loading modes' })}
            </div>
        )
    }

    if (modeRegistryQuery.isError || !modeRegistryQuery.data) {
        return (
            <div className={cls.ModeSelectorStatus} role='alert' title={modeRegistryQuery.error?.message}>
                {t('mode.selectorUnavailable', { defaultValue: 'Mode catalog unavailable' })}
            </div>
        )
    }

    return (
        <div className={cls.ModeSelector} role="tablist" aria-label={t('mode.selectorLabel', { defaultValue: 'Analysis Mode' })}>
            {modeRegistryQuery.data.modes.map(mode => (
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
