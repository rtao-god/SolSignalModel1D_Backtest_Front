import { Text } from '@/shared/ui'
import type { BacktestProfileDto } from '@/shared/types/backtest.types'
import cls from './BacktestPageHeader.module.scss'
interface BacktestPageHeaderProps {
    profiles: BacktestProfileDto[]
    currentProfile: BacktestProfileDto | null
    onProfileChange: (id: string) => void
}

export function BacktestPageHeader({ profiles, currentProfile, onProfileChange }: BacktestPageHeaderProps) {
    return (
        <header className={cls.header}>
            <Text type='h1'>Бэктест SOL/USDT</Text>
            <Text>Профили (BacktestProfile) vs one-shot preview по конфигу профиля + сравнение профилей A/B</Text>

            {profiles && profiles.length > 0 && (
                <div>
                    <Text>Профиль бэктеста (форма what-if):</Text>
                    <select value={currentProfile?.id ?? ''} onChange={e => onProfileChange(e.target.value)}>
                        {profiles.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name || p.id}
                            </option>
                        ))}
                    </select>
                    {currentProfile?.description && <Text>{currentProfile.description}</Text>}
                </div>
            )}
        </header>
    )
}
