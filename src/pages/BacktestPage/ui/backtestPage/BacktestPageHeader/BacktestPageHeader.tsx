import { Text, TpSlModeToggle } from '@/shared/ui'
import type { BacktestProfileDto, BacktestTpSlMode } from '@/shared/types/backtest.types'
import { useTranslation } from 'react-i18next'
import cls from './BacktestPageHeader.module.scss'

interface BacktestPageHeaderProps {
    profiles: BacktestProfileDto[]
    currentProfile: BacktestProfileDto | null
    onProfileChange: (id: string) => void
    tpSlMode: BacktestTpSlMode
    onTpSlModeChange: (mode: BacktestTpSlMode) => void
}

export function BacktestPageHeader({
    profiles,
    currentProfile,
    onProfileChange,
    tpSlMode,
    onTpSlModeChange
}: BacktestPageHeaderProps) {
    const { t } = useTranslation('reports')

    return (
        <header className={cls.header}>
            <Text type='h1'>{t('backtestFull.header.title')}</Text>
            <Text>{t('backtestFull.header.subtitle')}</Text>

            <div className={cls.tpSlModeBlock}>
                <Text>{t('backtestFull.header.tpSlSliceLabel')}</Text>
                <TpSlModeToggle
                    value={tpSlMode}
                    onChange={onTpSlModeChange}
                    className={cls.tpSlToggle}
                    ariaLabel={t('backtestFull.header.tpSlSliceAria')}
                />
                <Text className={cls.tpSlModeHint}>{t('backtestFull.header.tpSlSliceHint')}</Text>
            </div>

            {profiles.length > 0 && (
                <label className={cls.profileSelectBlock}>
                    <Text>{t('backtestFull.header.profileLabel')}</Text>
                    <select
                        className={cls.profileSelect}
                        value={currentProfile?.id ?? ''}
                        onChange={e => onProfileChange(e.target.value)}>
                        {profiles.map(profile => (
                            <option key={profile.id} value={profile.id}>
                                {profile.name || profile.id}
                            </option>
                        ))}
                    </select>
                    {currentProfile?.description && (
                        <Text className={cls.profileDescription}>{currentProfile.description}</Text>
                    )}
                </label>
            )}
        </header>
    )
}
