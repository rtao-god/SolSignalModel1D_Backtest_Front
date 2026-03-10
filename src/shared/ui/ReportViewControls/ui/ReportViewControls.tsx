import classNames from '@/shared/lib/helpers/classNames'
import { Btn, TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import cls from './ReportViewControls.module.scss'

export interface ReportViewControlOption<T extends string = string> {
    value: T
    label: string
    tooltip?: string
    tooltipExcludeTerms?: string[]
    tooltipExcludeRuleIds?: string[]
}

type ReportViewControlChangeHandler<T extends string> = {
    bivarianceHack(next: T): void
}['bivarianceHack']

export interface ReportViewControlGroup<T extends string = string> {
    key: string
    label: string
    ariaLabel?: string
    infoTooltip?: string
    infoTooltipExcludeTerms?: string[]
    infoTooltipExcludeRuleIds?: string[]
    value: T
    options: readonly ReportViewControlOption<T>[]
    onChange: ReportViewControlChangeHandler<T>
}

interface ReportViewControlsProps {
    groups?: readonly ReportViewControlGroup[]
    className?: string
}

export default function ReportViewControls({ groups = [], className }: ReportViewControlsProps) {
    const visibleGroups = groups.filter(group => group.options.length > 0)

    if (visibleGroups.length === 0) {
        return null
    }

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            {visibleGroups.map(group => (
                <div key={group.key} className={cls.controlBlock}>
                    <div className={cls.controlLabelRow}>
                        <Text className={cls.controlLabel}>{group.label}</Text>
                        {group.infoTooltip && (
                            <TermTooltip
                                term='?'
                                description={enrichTermTooltipDescription(group.infoTooltip, {
                                    excludeTerms: group.infoTooltipExcludeTerms,
                                    excludeRuleIds: group.infoTooltipExcludeRuleIds
                                })}
                                type='span'
                            />
                        )}
                    </div>

                    <div className={cls.buttons} role='group' aria-label={group.ariaLabel ?? group.label}>
                        {group.options.map(option => {
                            const isActive = option.value === group.value

                            return (
                                <Btn
                                    key={`${group.key}-${option.value}`}
                                    size='sm'
                                    className={classNames(cls.button, { [cls.buttonActive]: isActive }, [])}
                                    onClick={() => {
                                        if (!isActive) {
                                            group.onChange(option.value)
                                        }
                                    }}
                                    aria-pressed={isActive}>
                                    {option.label}
                                </Btn>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
