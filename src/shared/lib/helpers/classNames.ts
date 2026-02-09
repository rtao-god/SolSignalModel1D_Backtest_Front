
type Mods = Record<string, boolean | string>

export default function classNames(cls: string, mods: Mods = {}, additional: string[] = []): string {
    return [
        cls,
        ...Object.entries(mods)
            .filter(([, value]) => Boolean(value))
            .map(([key]) => key),
        ...additional.filter(Boolean)
    ].join(' ')
}

