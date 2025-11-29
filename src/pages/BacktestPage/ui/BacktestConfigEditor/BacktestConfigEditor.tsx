import { Text } from '@/shared/ui'
import type { BacktestConfigDto, BacktestPolicyConfigDto, BacktestProfileDto } from '@/shared/types/backtest.types'
import cls from './BacktestConfigEditor.module.scss'

interface BacktestConfigEditorProps {
    currentProfile: BacktestProfileDto | null
    draftConfig: BacktestConfigDto
    selectedPolicies: Record<string, boolean>
    isPreviewLoading: boolean
    previewError: string | null
    onStopPctChange: (valueStr: string) => void
    onTpPctChange: (valueStr: string) => void
    onPolicyEnabledChange: (name: string, checked: boolean) => void
    onPolicyLeverageChange: (name: string, valueStr: string) => void
    onRunPreview: () => void
}

/**
 * Редактор what-if конфига выбранного профиля:
 * - глобальные параметры SL/TP;
 * - включение/выключение политик;
 * - изменение плеча для const-политик;
 * - кнопка запуска preview.
 */
export function BacktestConfigEditor({
    currentProfile,
    draftConfig,
    selectedPolicies,
    isPreviewLoading,
    previewError,
    onStopPctChange,
    onTpPctChange,
    onPolicyEnabledChange,
    onPolicyLeverageChange,
    onRunPreview
}: BacktestConfigEditorProps) {
    return (
        <section id='whatif' className={cls.configEditor}>
            <Text type='p'>
                Основа: конфиг выбранного профиля
                {currentProfile ? ` (${currentProfile.name})` : ''}.
            </Text>

            <div className={cls.configRow}>
                <label className={cls.label}>
                    Daily SL (%):
                    <input
                        type='number'
                        className={cls.input}
                        value={(draftConfig.dailyStopPct * 100).toFixed(2)}
                        onChange={e => onStopPctChange(e.target.value)}
                    />
                </label>

                <label className={cls.label}>
                    Daily TP (%):
                    <input
                        type='number'
                        className={cls.input}
                        value={(draftConfig.dailyTpPct * 100).toFixed(2)}
                        onChange={e => onTpPctChange(e.target.value)}
                    />
                </label>
            </div>

            <div className={cls.policiesBlock}>
                <Text type='h3'>Политики плеча</Text>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            <th>Вкл</th>
                            <th>Имя</th>
                            <th>Тип</th>
                            <th>Плечо</th>
                            <th>Маржа</th>
                        </tr>
                    </thead>
                    <tbody>
                        {draftConfig.policies.map((p: BacktestPolicyConfigDto) => {
                            const enabled = selectedPolicies[p.name] ?? true
                            const isConst = p.policyType === 'const'

                            return (
                                <tr key={p.name}>
                                    <td>
                                        <input
                                            type='checkbox'
                                            checked={enabled}
                                            onChange={e => onPolicyEnabledChange(p.name, e.target.checked)}
                                        />
                                    </td>
                                    <td>{p.name}</td>
                                    <td>{p.policyType}</td>
                                    <td>
                                        <input
                                            type='number'
                                            className={cls.input}
                                            value={p.leverage != null ? String(p.leverage) : ''}
                                            onChange={e => onPolicyLeverageChange(p.name, e.target.value)}
                                            disabled={!isConst}
                                        />
                                    </td>
                                    <td>{p.marginMode}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <button type='button' className={cls.runButton} onClick={onRunPreview} disabled={isPreviewLoading}>
                {isPreviewLoading ? 'Запускаю тест...' : 'Запустить тест'}
            </button>

            {previewError && (
                <Text type='p' className={cls.errorText}>
                    {previewError}
                </Text>
            )}
        </section>
    )
}
