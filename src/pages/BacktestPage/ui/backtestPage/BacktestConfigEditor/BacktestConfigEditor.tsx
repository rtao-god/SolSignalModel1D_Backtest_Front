import { Btn, Input, TermTooltip, Text } from '@/shared/ui'
import type { BacktestPolicyConfigDto } from '@/shared/types/backtest.types'
import cls from './BacktestConfigEditor.module.scss'
import BacktestConfigEditorProps from './types'

const CONFIG_COLUMN_TOOLTIPS: Record<string, string> = {
    Вкл: 'Включить или выключить политику для preview‑бэктеста.',
    Имя: 'Название политики (стратегии).',
    Тип: 'Тип логики политики. Для const можно вручную задать плечо.',
    Плечо: 'Плечо сделки. Для константных политик редактируется вручную.',
    Маржа: 'Режим маржи: Cross или Isolated.'
}

const renderTooltip = (term: string, description?: string) =>
    description ? <TermTooltip term={term} description={description} type='span' /> : term

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
            <Text>
                Основа: конфиг выбранного профиля
                {currentProfile ? ` (${currentProfile.name})` : ''}.
            </Text>

            <div className={cls.configRow}>
                <label className={cls.label}>
                    {renderTooltip(
                        'Daily SL (%)',
                        'Дневной стоп‑лосс в процентах. При превышении убыточного порога стратегия закрывает позиции.'
                    )}
                    <Input
                        type='number'
                        className={cls.input}
                        value={(draftConfig.dailyStopPct * 100).toFixed(2)}
                        onChange={e => onStopPctChange(e.target.value)}
                    />
                </label>

                <label className={cls.label}>
                    {renderTooltip(
                        'Daily TP (%)',
                        'Дневной тейк‑профит в процентах. При достижении порога фиксируется прибыль.'
                    )}
                    <Input
                        type='number'
                        className={cls.input}
                        value={(draftConfig.dailyTpPct * 100).toFixed(2)}
                        onChange={e => onTpPctChange(e.target.value)}
                    />
                </label>
            </div>

            <div className={cls.policiesBlock}>
                <Text type='h3'>Политики плеча</Text>
                <Text>
                    Список политик, которые будут использованы в preview. Здесь можно выключать политики и задавать
                    плечо для константных стратегий.
                </Text>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            <th>{renderTooltip('Вкл', CONFIG_COLUMN_TOOLTIPS.Вкл)}</th>
                            <th>{renderTooltip('Имя', CONFIG_COLUMN_TOOLTIPS.Имя)}</th>
                            <th>{renderTooltip('Тип', CONFIG_COLUMN_TOOLTIPS.Тип)}</th>
                            <th>{renderTooltip('Плечо', CONFIG_COLUMN_TOOLTIPS.Плечо)}</th>
                            <th>{renderTooltip('Маржа', CONFIG_COLUMN_TOOLTIPS.Маржа)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {draftConfig.policies.map((p: BacktestPolicyConfigDto) => {
                            const enabled = selectedPolicies[p.name] ?? true
                            const isConst = p.policyType === 'const'

                            return (
                                <tr key={p.name}>
                                    <td>
                                        <Input
                                            type='checkbox'
                                            checked={enabled}
                                            onChange={e => onPolicyEnabledChange(p.name, e.target.checked)}
                                        />
                                    </td>
                                    <td>{p.name}</td>
                                    <td>{p.policyType}</td>
                                    <td>
                                        <Input
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

            <Btn className={cls.runButton} onClick={onRunPreview} disabled={isPreviewLoading}>
                {isPreviewLoading ? 'Запускаю тест...' : 'Запустить тест'}
            </Btn>

            {previewError && <Text className={cls.errorText}>{previewError}</Text>}
        </section>
    )
}
