import { Text, TpSlModeToggle } from '@/shared/ui'
import type { BacktestProfileDto, BacktestTpSlMode } from '@/shared/types/backtest.types'
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
    return (
        <header className={cls.header}>
            <Text type='h1'>Backtest Full: профили, What-if и A/B сравнение</Text>
            <Text>
                What-if, baseline (в dynamic/static) и A/B запускают one-shot preview по текущему backend конфигу:
                вместе с dynamic TP/SL, confidence-gating и policy-ratios.
            </Text>

            <div className={cls.tpSlModeBlock}>
                <Text>Срез TP/SL в метриках</Text>
                <TpSlModeToggle
                    value={tpSlMode}
                    onChange={onTpSlModeChange}
                    className={cls.tpSlToggle}
                    ariaLabel='Срез TP/SL для /backtest/full'
                />
                <Text className={cls.tpSlModeHint}>
                    `ALL` запускает смешанный режим. `DYNAMIC` и `STATIC` запускают отдельные симуляции:
                    только с dynamic TP/SL или только со static TP/SL.
                </Text>
            </div>

            {profiles.length > 0 && (
                <label className={cls.profileSelectBlock}>
                    <Text>Активный профиль what-if</Text>
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
                    {currentProfile?.description && <Text className={cls.profileDescription}>{currentProfile.description}</Text>}
                </label>
            )}
        </header>
    )
}
