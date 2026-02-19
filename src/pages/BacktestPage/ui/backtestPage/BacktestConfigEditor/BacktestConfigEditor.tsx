import { Btn, Input, TermTooltip, Text } from '@/shared/ui'
import type { BacktestPolicyConfigDto } from '@/shared/types/backtest.types'
import cls from './BacktestConfigEditor.module.scss'
import BacktestConfigEditorProps from './types'

const CONFIG_COLUMN_TOOLTIPS: Record<string, string> = {
    Вкл: 'Включить/выключить политику в текущем one-shot preview.',
    Имя: 'Имя политики.',
    Тип: 'Тип логики политики (const, risk_aware, ultra_safe, dynamic, spot).',
    Плечо: 'Для const-политик можно вручную изменить плечо. Для остальных типов не используется.',
    Маржа: 'Режим маржи политики: Cross или Isolated.'
}

const renderTooltip = (term: string, description?: string) =>
    description ? <TermTooltip term={term} description={description} type='span' /> : term

function formatPct(value01: number): string {
    return (value01 * 100).toFixed(2)
}

export function BacktestConfigEditor({
    currentProfile,
    draftConfig,
    selectedPolicies,
    isPreviewLoading,
    previewError,
    onStopPctChange,
    onTpPctChange,
    onConfidenceRiskPctChange,
    onConfidenceRiskRawChange,
    onConfidenceRiskIntChange,
    onShiftDynamicTpSl,
    onPolicyEnabledChange,
    onPolicyLeverageChange,
    onRunPreview
}: BacktestConfigEditorProps) {
    const confidenceRisk = draftConfig.confidenceRisk

    return (
        <section id='whatif' className={cls.configEditor}>
            <Text>
                Основа what-if: профиль {currentProfile ? `«${currentProfile.name}»` : 'без названия'}.
                {currentProfile?.description ? ` ${currentProfile.description}` : ''}
            </Text>

            <div className={cls.configRow}>
                <label className={cls.label}>
                    {renderTooltip(
                        'Baseline SL (%)',
                        'Базовый дневной stop-loss. Если dynamic TP/SL для дня не активируется, применяется это значение.'
                    )}
                    <Input
                        type='number'
                        className={cls.input}
                        value={formatPct(draftConfig.dailyStopPct)}
                        onChange={e => onStopPctChange(e.target.value)}
                    />
                </label>

                <label className={cls.label}>
                    {renderTooltip(
                        'Baseline TP (%)',
                        'Базовый дневной take-profit. Dynamic-оверлей масштабирует его только при прохождении confidence-правил.'
                    )}
                    <Input
                        type='number'
                        className={cls.input}
                        value={formatPct(draftConfig.dailyTpPct)}
                        onChange={e => onTpPctChange(e.target.value)}
                    />
                </label>
            </div>

            {confidenceRisk ?
                <section className={cls.dynamicBlock}>
                    <Text type='h3'>Dynamic TP/SL overlay (confidence-risk)</Text>
                    <Text className={cls.dynamicInfo}>
                        Dynamic TP/SL применяется только если confidence bucket проходит исторические ограничения
                        (минимум samples + минимальный win-rate). В остальных днях остаются baseline TP/SL.
                    </Text>

                    <div className={cls.quickActions}>
                        <Btn variant='secondary' colorScheme='blue' onClick={() => onShiftDynamicTpSl('tighter')}>
                            Сделать TP/SL ближе
                        </Btn>
                        <Btn variant='secondary' colorScheme='blue' onClick={() => onShiftDynamicTpSl('wider')}>
                            Сделать TP/SL дальше
                        </Btn>
                    </div>

                    <div className={cls.configRow}>
                        <label className={cls.label}>
                            {renderTooltip(
                                'TP mult min',
                                'Нижний множитель динамического TP относительно baseline TP (доли, не проценты).'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={confidenceRisk.tpMultiplierMin.toFixed(3)}
                                onChange={e => onConfidenceRiskRawChange('tpMultiplierMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderTooltip(
                                'TP mult max',
                                'Верхний множитель динамического TP относительно baseline TP.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={confidenceRisk.tpMultiplierMax.toFixed(3)}
                                onChange={e => onConfidenceRiskRawChange('tpMultiplierMax', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderTooltip(
                                'SL mult min',
                                'Нижний множитель динамического SL относительно baseline SL.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={confidenceRisk.slMultiplierMin.toFixed(3)}
                                onChange={e => onConfidenceRiskRawChange('slMultiplierMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderTooltip(
                                'SL mult max',
                                'Верхний множитель динамического SL относительно baseline SL.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={confidenceRisk.slMultiplierMax.toFixed(3)}
                                onChange={e => onConfidenceRiskRawChange('slMultiplierMax', e.target.value)}
                            />
                        </label>
                    </div>

                    <div className={cls.configRow}>
                        <label className={cls.label}>
                            {renderTooltip(
                                'Daily TP min (%)',
                                'Жёсткий нижний кламп итогового dynamic TP после всех множителей.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.dailyTpPctMin)}
                                onChange={e => onConfidenceRiskPctChange('dailyTpPctMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderTooltip(
                                'Daily TP max (%)',
                                'Жёсткий верхний кламп итогового dynamic TP.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.dailyTpPctMax)}
                                onChange={e => onConfidenceRiskPctChange('dailyTpPctMax', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderTooltip(
                                'Daily SL min (%)',
                                'Жёсткий нижний кламп итогового dynamic SL.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.dailySlPctMin)}
                                onChange={e => onConfidenceRiskPctChange('dailySlPctMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderTooltip(
                                'Daily SL max (%)',
                                'Жёсткий верхний кламп итогового dynamic SL.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.dailySlPctMax)}
                                onChange={e => onConfidenceRiskPctChange('dailySlPctMax', e.target.value)}
                            />
                        </label>
                    </div>

                    <div className={cls.configRow}>
                        <label className={cls.label}>
                            {renderTooltip(
                                'Min bucket samples',
                                'Минимум исторических наблюдений в confidence-bucket, после которого разрешается dynamic TP/SL.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={String(confidenceRisk.confidenceEvidenceMinBucketSamples)}
                                onChange={e =>
                                    onConfidenceRiskIntChange('confidenceEvidenceMinBucketSamples', e.target.value)
                                }
                            />
                        </label>
                        <label className={cls.label}>
                            {renderTooltip(
                                'Min bucket win-rate (%)',
                                'Минимальный исторический win-rate в confidence-bucket для включения dynamic TP/SL.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.confidenceEvidenceMinBucketWinRate)}
                                onChange={e =>
                                    onConfidenceRiskPctChange('confidenceEvidenceMinBucketWinRate', e.target.value)
                                }
                            />
                        </label>
                        <label className={cls.label}>
                            {renderTooltip(
                                'Conf gate min (%)',
                                'Минимальная directional confidence для допуска сделки.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.confGateMin)}
                                onChange={e => onConfidenceRiskPctChange('confGateMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderTooltip(
                                'Conf gate risk-day (%)',
                                'Минимальная confidence для RiskDay (если 0, используется Conf gate min).'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.confGateRiskDayMin)}
                                onChange={e => onConfidenceRiskPctChange('confGateRiskDayMin', e.target.value)}
                            />
                        </label>
                    </div>
                </section>
            :   <section className={cls.dynamicBlock}>
                    <Text type='h3'>Dynamic TP/SL overlay</Text>
                    <Text className={cls.dynamicInfo}>
                        В этом профиле confidence-risk overlay отсутствует или отключён. Preview будет идти по baseline
                        TP/SL без динамических модификаций.
                    </Text>
                </section>}

            <div className={cls.policiesBlock}>
                <Text type='h3'>Политики плеча</Text>
                <Text>Выберите, какие политики участвуют в preview, и при необходимости скорректируйте const плечо.</Text>

                <div className={cls.tableWrap}>
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
                            {draftConfig.policies.map((policy: BacktestPolicyConfigDto) => {
                                const enabled = selectedPolicies[policy.name] ?? true
                                const isConst = policy.policyType === 'const'

                                return (
                                    <tr key={policy.name}>
                                        <td>
                                            <input
                                                type='checkbox'
                                                className={cls.checkbox}
                                                checked={enabled}
                                                onChange={e => onPolicyEnabledChange(policy.name, e.target.checked)}
                                            />
                                        </td>
                                        <td>{policy.name}</td>
                                        <td>{policy.policyType}</td>
                                        <td>
                                            <Input
                                                type='number'
                                                className={cls.input}
                                                value={policy.leverage != null ? String(policy.leverage) : ''}
                                                onChange={e => onPolicyLeverageChange(policy.name, e.target.value)}
                                                disabled={!isConst}
                                            />
                                        </td>
                                        <td>{policy.marginMode}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Btn className={cls.runButton} onClick={onRunPreview} disabled={isPreviewLoading}>
                {isPreviewLoading ? 'Запускаю preview...' : 'Запустить preview'}
            </Btn>

            {previewError && <Text className={cls.errorText}>{previewError}</Text>}
        </section>
    )
}

