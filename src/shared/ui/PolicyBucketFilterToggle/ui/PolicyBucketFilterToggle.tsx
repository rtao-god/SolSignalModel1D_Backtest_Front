import { BucketFilterToggle, type BucketFilterOption } from '@/shared/ui/BucketFilterToggle'
import type { PolicyBranchMegaBucketMode } from '@/shared/utils/policyBranchMegaTabs'

interface PolicyBucketFilterToggleProps {
    value: PolicyBranchMegaBucketMode
    onChange: (value: PolicyBranchMegaBucketMode) => void
    className?: string
    ariaLabel?: string
}

const POLICY_BUCKET_OPTIONS: readonly BucketFilterOption[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'intraday', label: 'Intraday' },
    { value: 'delayed', label: 'Delayed' },
    { value: 'total', label: 'Σ Все бакеты' }
]

const POLICY_BUCKET_VALUES = new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'delayed', 'total'])

function isPolicyBranchMegaBucketMode(value: string): value is PolicyBranchMegaBucketMode {
    return POLICY_BUCKET_VALUES.has(value as PolicyBranchMegaBucketMode)
}

export function PolicyBucketFilterToggle({
    value,
    onChange,
    className,
    ariaLabel
}: PolicyBucketFilterToggleProps) {
    if (!isPolicyBranchMegaBucketMode(value)) {
        throw new Error(`[ui] Unsupported policy bucket filter value: ${value}.`)
    }

    const handleChange = (nextValue: string) => {
        if (!isPolicyBranchMegaBucketMode(nextValue)) {
            throw new Error(`[ui] Unsupported policy bucket filter option: ${nextValue}.`)
        }

        onChange(nextValue)
    }

    return (
        <BucketFilterToggle
            value={value}
            options={POLICY_BUCKET_OPTIONS}
            onChange={handleChange}
            className={className}
            ariaLabel={ariaLabel ?? 'Фильтр по бакетам'}
        />
    )
}
