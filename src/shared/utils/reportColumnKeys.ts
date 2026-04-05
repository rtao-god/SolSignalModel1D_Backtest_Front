export interface ReportColumnContractDescriptor {
    label: string
    key: string
}

function sanitizeReportColumnMachineKeyFragment(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) {
        throw new Error('[report-column-keys] column label must be non-empty while building contract key.')
    }

    let result = ''
    let prevSeparator = false

    for (const ch of trimmed) {
        if (/[A-Za-z0-9]/.test(ch)) {
            result += ch.toLowerCase()
            prevSeparator = false
            continue
        }

        if (prevSeparator) {
            continue
        }

        result += '_'
        prevSeparator = true
    }

    const sanitized = result.replace(/^_+|_+$/g, '')
    if (!sanitized) {
        throw new Error(
            `[report-column-keys] sanitized column key is empty. owner=report-column-contract | actual=${value}.`
        )
    }

    return sanitized
}

function buildDerivedColumnKeys(columns: readonly string[]): string[] {
    const usedKeys = new Set<string>()

    return columns.map(column => {
        const baseKey = sanitizeReportColumnMachineKeyFragment(column)
        let key = baseKey
        let duplicateIndex = 2

        while (usedKeys.has(key)) {
            key = `${baseKey}_${duplicateIndex}`
            duplicateIndex += 1
        }

        usedKeys.add(key)
        return key
    })
}

export function buildReportColumnContractDescriptors(
    columns: readonly string[],
    columnKeys?: readonly string[]
): ReportColumnContractDescriptor[] {
    if (!columns || columns.length === 0) {
        throw new Error('[report-column-keys] columns list is empty.')
    }

    const hasCompleteColumnKeys =
        Array.isArray(columnKeys) &&
        columnKeys.length >= columns.length &&
        columns.every((_, index) => typeof columnKeys[index] === 'string' && columnKeys[index]!.trim().length > 0)

    const resolvedKeys = hasCompleteColumnKeys ? columns.map((_, index) => columnKeys![index]!.trim()) : buildDerivedColumnKeys(columns)

    return columns.map((label, index) => {
        if (typeof label !== 'string' || label.trim().length === 0) {
            throw new Error(`[report-column-keys] column label is empty. index=${index}.`)
        }

        return {
            label,
            key: resolvedKeys[index]!
        }
    })
}

export function buildCanonicalReportColumnDescriptors(columns: readonly string[]): ReportColumnContractDescriptor[] {
    return buildReportColumnContractDescriptors(columns)
}
