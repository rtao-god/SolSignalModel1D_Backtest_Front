import { Btn, Input, TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import type { BacktestPolicyConfigDto } from '@/shared/types/backtest.types'
import { resolveCommonReportColumnTooltipOrNull } from '@/shared/terms/common'
import { useTranslation } from 'react-i18next'
import cls from './BacktestConfigEditor.module.scss'
import BacktestConfigEditorProps from './types'

interface ConfigColumnDefinition {
    id: 'enabled' | 'name' | 'type' | 'leverage' | 'margin'
    defaultLabel: string
    defaultTooltip: string
}

const CONFIG_COLUMN_DEFINITIONS: readonly ConfigColumnDefinition[] = [
    {
        id: 'enabled',
        defaultLabel: 'Enabled',
        defaultTooltip: 'Enable or disable policy in the current one-shot preview.'
    },
    {
        id: 'name',
        defaultLabel: 'Policy',
        defaultTooltip: 'Policy name.'
    },
    {
        id: 'type',
        defaultLabel: 'Type',
        defaultTooltip: 'Policy logic type (const, risk_aware, ultra_safe, dynamic, spot).'
    },
    {
        id: 'leverage',
        defaultLabel: 'Leverage',
        defaultTooltip: 'For const policies leverage can be edited manually. Other policy types ignore this field.'
    },
    {
        id: 'margin',
        defaultLabel: 'Margin',
        defaultTooltip: 'Policy margin mode: Cross or Isolated.'
    }
]

const renderTooltip = (term: string, description?: string) =>
    description ?
        <TermTooltip term={term} description={enrichTermTooltipDescription(description, { term })} type='span' />
    :   term

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
    const { t, i18n } = useTranslation('reports')
    const confidenceRisk = draftConfig.confidenceRisk
    const tooltipLocale = (i18n.resolvedLanguage ?? i18n.language).startsWith('ru') ? 'ru' : 'en'
    const profileName =
        currentProfile?.name ?? t('backtestFull.configEditor.profileUnnamed', { defaultValue: 'unnamed' })
    const profileIntro = t('backtestFull.configEditor.profileIntro', {
        profileName,
        defaultValue: 'What-if baseline: profile "{{profileName}}".'
    })
    const resolveText = (key: string, defaultValue: string) => t(key, { defaultValue })
    const renderLocalizedTooltip = (term: string, descriptionKey: string, defaultDescription: string) =>
        renderTooltip(term, t(descriptionKey, { defaultValue: defaultDescription }))
    const resolveSharedReportTooltip = (title: string): string => {
        const description = resolveCommonReportColumnTooltipOrNull(title, tooltipLocale)
        if (!description) {
            throw new Error(`Missing shared report tooltip for '${title}' in BacktestConfigEditor.`)
        }

        return description
    }

    return (
        <section id='whatif' className={cls.configEditor}>
            <Text>
                {profileIntro}
                {currentProfile?.description ? ` ${currentProfile.description}` : ''}
            </Text>

            <div className={cls.configRow}>
                <label className={cls.label}>
                    {renderLocalizedTooltip(
                        'Baseline SL (%)',
                        'backtestFull.configEditor.fields.baselineSl.tooltip',
                        'Base daily stop-loss. If dynamic TP/SL is not activated for the day, this value is used.'
                    )}
                    <Input
                        type='number'
                        className={cls.input}
                        value={formatPct(draftConfig.dailyStopPct)}
                        onChange={e => onStopPctChange(e.target.value)}
                    />
                </label>

                <label className={cls.label}>
                    {renderLocalizedTooltip(
                        'Baseline TP (%)',
                        'backtestFull.configEditor.fields.baselineTp.tooltip',
                        'Base daily take-profit. Dynamic overlay scales it only when confidence rules allow it.'
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
                    <Text type='h3'>
                        {resolveText(
                            'backtestFull.configEditor.dynamic.titleEnabled',
                            'Dynamic TP/SL overlay (confidence-risk)'
                        )}
                    </Text>
                    <Text className={cls.dynamicInfo}>
                        {resolveText(
                            'backtestFull.configEditor.dynamic.infoEnabled',
                            'Dynamic TP/SL is applied only when confidence bucket passes historical constraints (minimum samples + minimum win-rate). Baseline TP/SL is used on all other days.'
                        )}
                    </Text>

                    <div className={cls.quickActions}>
                        <Btn variant='secondary' colorScheme='blue' onClick={() => onShiftDynamicTpSl('tighter')}>
                            {resolveText('backtestFull.configEditor.dynamic.actions.tighten', 'Tighten TP/SL')}
                        </Btn>
                        <Btn variant='secondary' colorScheme='blue' onClick={() => onShiftDynamicTpSl('wider')}>
                            {resolveText('backtestFull.configEditor.dynamic.actions.widen', 'Widen TP/SL')}
                        </Btn>
                    </div>

                    <div className={cls.configRow}>
                        <label className={cls.label}>
                            {renderLocalizedTooltip(
                                'TP mult min',
                                'backtestFull.configEditor.dynamic.fields.tpMultMin.tooltip',
                                'Lower multiplier of dynamic TP relative to baseline TP (fraction, not percent).'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={confidenceRisk.tpMultiplierMin.toFixed(3)}
                                onChange={e => onConfidenceRiskRawChange('tpMultiplierMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderLocalizedTooltip(
                                'TP mult max',
                                'backtestFull.configEditor.dynamic.fields.tpMultMax.tooltip',
                                'Upper multiplier of dynamic TP relative to baseline TP.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={confidenceRisk.tpMultiplierMax.toFixed(3)}
                                onChange={e => onConfidenceRiskRawChange('tpMultiplierMax', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderLocalizedTooltip(
                                'SL mult min',
                                'backtestFull.configEditor.dynamic.fields.slMultMin.tooltip',
                                'Lower multiplier of dynamic SL relative to baseline SL.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={confidenceRisk.slMultiplierMin.toFixed(3)}
                                onChange={e => onConfidenceRiskRawChange('slMultiplierMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderLocalizedTooltip(
                                'SL mult max',
                                'backtestFull.configEditor.dynamic.fields.slMultMax.tooltip',
                                'Upper multiplier of dynamic SL relative to baseline SL.'
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
                            {renderLocalizedTooltip(
                                'Daily TP min (%)',
                                'backtestFull.configEditor.dynamic.fields.dailyTpMin.tooltip',
                                'Hard lower clamp for final dynamic TP after all multipliers.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.dailyTpPctMin)}
                                onChange={e => onConfidenceRiskPctChange('dailyTpPctMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderLocalizedTooltip(
                                'Daily TP max (%)',
                                'backtestFull.configEditor.dynamic.fields.dailyTpMax.tooltip',
                                'Hard upper clamp for final dynamic TP.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.dailyTpPctMax)}
                                onChange={e => onConfidenceRiskPctChange('dailyTpPctMax', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderLocalizedTooltip(
                                'Daily SL min (%)',
                                'backtestFull.configEditor.dynamic.fields.dailySlMin.tooltip',
                                'Hard lower clamp for final dynamic SL.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.dailySlPctMin)}
                                onChange={e => onConfidenceRiskPctChange('dailySlPctMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderLocalizedTooltip(
                                'Daily SL max (%)',
                                'backtestFull.configEditor.dynamic.fields.dailySlMax.tooltip',
                                'Hard upper clamp for final dynamic SL.'
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
                            {renderLocalizedTooltip(
                                'Min bucket samples',
                                'backtestFull.configEditor.dynamic.fields.minBucketSamples.tooltip',
                                'Minimum historical observations in confidence bucket required to allow dynamic TP/SL.'
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
                            {renderLocalizedTooltip(
                                'Min bucket win-rate (%)',
                                'backtestFull.configEditor.dynamic.fields.minBucketWinRate.tooltip',
                                'Minimum historical win-rate in confidence bucket required to enable dynamic TP/SL.'
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
                            {renderLocalizedTooltip(
                                'Conf gate min (%)',
                                'backtestFull.configEditor.dynamic.fields.confGateMin.tooltip',
                                'Minimum directional confidence required to allow a trade.'
                            )}
                            <Input
                                type='number'
                                className={cls.input}
                                value={formatPct(confidenceRisk.confGateMin)}
                                onChange={e => onConfidenceRiskPctChange('confGateMin', e.target.value)}
                            />
                        </label>
                        <label className={cls.label}>
                            {renderLocalizedTooltip(
                                'Conf gate risk-day (%)',
                                'backtestFull.configEditor.dynamic.fields.confGateRiskDayMin.tooltip',
                                'Minimum confidence for RiskDay. If 0, Conf gate min is used.'
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
                    <Text type='h3'>
                        {resolveText('backtestFull.configEditor.dynamic.titleDisabled', 'Dynamic TP/SL overlay')}
                    </Text>
                    <Text className={cls.dynamicInfo}>
                        {resolveText(
                            'backtestFull.configEditor.dynamic.infoDisabled',
                            'This profile has confidence-risk overlay disabled or missing. Preview runs with baseline TP/SL without dynamic modifiers.'
                        )}
                    </Text>
                </section>
            }

            <div className={cls.policiesBlock}>
                <Text type='h3'>{resolveText('backtestFull.configEditor.policyTable.title', 'Leverage policies')}</Text>
                <Text>
                    {resolveText(
                        'backtestFull.configEditor.policyTable.subtitle',
                        'Select policies included in preview and adjust const leverage if needed.'
                    )}
                </Text>

                <div className={cls.tableWrap}>
                    <table className={cls.table}>
                        <thead>
                            <tr>
                                {CONFIG_COLUMN_DEFINITIONS.map(column => {
                                    const label = t(
                                        `backtestFull.configEditor.policyTable.columns.${column.id}.label`,
                                        {
                                            defaultValue: column.defaultLabel
                                        }
                                    )
                                    const tooltip = t(
                                        `backtestFull.configEditor.policyTable.columns.${column.id}.tooltip`,
                                        {
                                            defaultValue: column.defaultTooltip
                                        }
                                    )
                                    const resolvedTooltip =
                                        column.id === 'name' ? resolveSharedReportTooltip('Policy') : tooltip

                                    return <th key={column.id}>{renderTooltip(label, resolvedTooltip)}</th>
                                })}
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
                {isPreviewLoading ?
                    resolveText('backtestFull.configEditor.runButton.loading', 'Running preview...')
                :   resolveText('backtestFull.configEditor.runButton.default', 'Run preview')}
            </Btn>

            {previewError && <Text className={cls.errorText}>{previewError}</Text>}
        </section>
    )
}
