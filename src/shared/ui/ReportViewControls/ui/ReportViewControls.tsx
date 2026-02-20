import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text, TpSlModeToggle } from '@/shared/ui'
import type {
    PolicyBranchMegaBucketMode,
    PolicyBranchMegaMetricMode,
    PolicyBranchMegaSlMode,
    PolicyBranchMegaTpSlMode,
    PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import type { ReportViewCapabilities } from '@/shared/utils/reportViewCapabilities'
import cls from './ReportViewControls.module.scss'

interface ReportViewControlsProps {
    bucket: PolicyBranchMegaBucketMode
    metric: PolicyBranchMegaMetricMode
    tpSlMode: PolicyBranchMegaTpSlMode
    slMode?: PolicyBranchMegaSlMode
    zonalMode?: PolicyBranchMegaZonalMode
    capabilities: ReportViewCapabilities
    onBucketChange: (next: PolicyBranchMegaBucketMode) => void
    onMetricChange: (next: PolicyBranchMegaMetricMode) => void
    onTpSlModeChange: (next: PolicyBranchMegaTpSlMode) => void
    onSlModeChange?: (next: PolicyBranchMegaSlMode) => void
    onZonalModeChange?: (next: PolicyBranchMegaZonalMode) => void
    metricDiffMessage?: string | null
    className?: string
}

const BUCKET_OPTIONS: Array<{ value: PolicyBranchMegaBucketMode; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'intraday', label: 'Intraday' },
    { value: 'delayed', label: 'Delayed' },
    { value: 'total', label: 'Σ Все бакеты' }
]

const METRIC_OPTIONS: Array<{ value: PolicyBranchMegaMetricMode; label: string }> = [
    { value: 'real', label: 'REAL' },
    { value: 'no-biggest-liq-loss', label: 'NO BIGGEST LIQ LOSS' }
]

const SL_MODE_OPTIONS: Array<{ value: PolicyBranchMegaSlMode; label: string }> = [
    { value: 'all', label: 'ALL' },
    { value: 'with-sl', label: 'WITH SL' },
    { value: 'no-sl', label: 'NO SL' }
]

const ZONAL_OPTIONS: Array<{ value: PolicyBranchMegaZonalMode; label: string }> = [
    { value: 'with-zonal', label: 'С зональностью' },
    { value: 'without-zonal', label: 'Без зональности' }
]

export default function ReportViewControls({
    bucket,
    metric,
    tpSlMode,
    slMode,
    zonalMode,
    capabilities,
    onBucketChange,
    onMetricChange,
    onTpSlModeChange,
    onSlModeChange,
    onZonalModeChange,
    metricDiffMessage,
    className
}: ReportViewControlsProps) {
    const showBucketControls = capabilities.supportsBucketFiltering
    const showMetricControls = capabilities.supportsMetricFiltering
    const showTpSlControls = capabilities.supportsTpSlFiltering
    const showSlModeControls = Boolean(capabilities.supportsSlModeFiltering && slMode && onSlModeChange)
    const showZonalControls = Boolean(capabilities.supportsZonalFiltering && zonalMode && onZonalModeChange)
    const hasAtLeastOneControl =
        showBucketControls || showMetricControls || showTpSlControls || showSlModeControls || showZonalControls

    if (!hasAtLeastOneControl && !metricDiffMessage) {
        return null
    }

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])}>
            {showBucketControls && (
                <div className={cls.controlBlock}>
                    <Text className={cls.controlLabel}>Бакет капитала</Text>
                    <div className={cls.buttons}>
                        {BUCKET_OPTIONS.map(option => (
                            <Btn
                                key={option.value}
                                size='sm'
                                className={classNames(
                                    cls.button,
                                    {
                                        [cls.buttonActive]: option.value === bucket
                                    },
                                    []
                                )}
                                onClick={() => {
                                    if (option.value !== bucket) {
                                        onBucketChange(option.value)
                                    }
                                }}
                                aria-pressed={option.value === bucket}>
                                {option.label}
                            </Btn>
                        ))}
                    </div>
                </div>
            )}

            {showMetricControls && (
                <div className={cls.controlBlock}>
                    <Text className={cls.controlLabel}>Режим метрик</Text>
                    <div className={cls.buttons}>
                        {METRIC_OPTIONS.map(option => (
                            <Btn
                                key={option.value}
                                size='sm'
                                className={classNames(
                                    cls.button,
                                    {
                                        [cls.buttonActive]: option.value === metric
                                    },
                                    []
                                )}
                                onClick={() => {
                                    if (option.value !== metric) {
                                        onMetricChange(option.value)
                                    }
                                }}
                                aria-pressed={option.value === metric}>
                                {option.label}
                            </Btn>
                        ))}
                    </div>
                </div>
            )}

            {showTpSlControls && (
                <div className={cls.controlBlock}>
                    <Text className={cls.controlLabel}>Срез TP/SL</Text>
                    <TpSlModeToggle
                        value={tpSlMode}
                        onChange={onTpSlModeChange}
                        className={cls.tpSlToggle}
                        ariaLabel='Срез TP/SL для отчёта'
                    />
                </div>
            )}

            {showSlModeControls && slMode && onSlModeChange && (
                <div className={cls.controlBlock}>
                    <Text className={cls.controlLabel}>SL-режим</Text>
                    <div className={cls.buttons}>
                        {SL_MODE_OPTIONS.map(option => (
                            <Btn
                                key={option.value}
                                size='sm'
                                className={classNames(
                                    cls.button,
                                    {
                                        [cls.buttonActive]: option.value === slMode
                                    },
                                    []
                                )}
                                onClick={() => {
                                    if (option.value !== slMode) {
                                        onSlModeChange(option.value)
                                    }
                                }}
                                aria-pressed={option.value === slMode}>
                                {option.label}
                            </Btn>
                        ))}
                    </div>
                </div>
            )}

            {showZonalControls && zonalMode && onZonalModeChange && (
                <div className={cls.controlBlock}>
                    <Text className={cls.controlLabel}>Confidence-zonal</Text>
                    <div className={cls.buttons}>
                        {ZONAL_OPTIONS.map(option => (
                            <Btn
                                key={option.value}
                                size='sm'
                                className={classNames(
                                    cls.button,
                                    {
                                        [cls.buttonActive]: option.value === zonalMode
                                    },
                                    []
                                )}
                                onClick={() => {
                                    if (option.value !== zonalMode) {
                                        onZonalModeChange(option.value)
                                    }
                                }}
                                aria-pressed={option.value === zonalMode}>
                                {option.label}
                            </Btn>
                        ))}
                    </div>
                </div>
            )}

            {metricDiffMessage && <Text className={cls.metricDiff}>{metricDiffMessage}</Text>}
        </div>
    )
}
