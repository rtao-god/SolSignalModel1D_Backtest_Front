function formatAlpha(alpha: number): string {
    const rounded = Math.round(alpha * 1000) / 1000
    return Number.isInteger(rounded) ? String(rounded) : rounded.toString()
}

function clampByte(value: number): number {
    if (!Number.isFinite(value)) {
        throw new Error(`[lightweight-chart-color] rgb component must be finite. actual=${value}.`)
    }

    if (value < 0 || value > 255) {
        throw new Error(
            `[lightweight-chart-color] rgb component is out of range. expected=0..255 | actual=${value}.`
        )
    }

    return Math.round(value)
}

function clampUnitAlpha(value: number): number {
    if (!Number.isFinite(value)) {
        throw new Error(`[lightweight-chart-color] alpha must be finite. actual=${value}.`)
    }

    if (value < 0 || value > 1) {
        throw new Error(
            `[lightweight-chart-color] alpha is out of range. expected=0..1 | actual=${value}.`
        )
    }

    return value
}

function parseFiniteNumber(raw: string, label: string): number {
    const value = Number(raw)
    if (!Number.isFinite(value)) {
        throw new Error(`[lightweight-chart-color] ${label} must be finite. actual=${raw}.`)
    }

    return value
}

function hslToRgb(hue: number, saturationPct: number, lightnessPct: number): [number, number, number] {
    if (saturationPct < 0 || saturationPct > 100) {
        throw new Error(
            `[lightweight-chart-color] saturation is out of range. expected=0..100 | actual=${saturationPct}.`
        )
    }
    if (lightnessPct < 0 || lightnessPct > 100) {
        throw new Error(
            `[lightweight-chart-color] lightness is out of range. expected=0..100 | actual=${lightnessPct}.`
        )
    }

    const normalizedHue = ((hue % 360) + 360) % 360
    const s = saturationPct / 100
    const l = lightnessPct / 100
    const chroma = (1 - Math.abs(2 * l - 1)) * s
    const huePrime = normalizedHue / 60
    const x = chroma * (1 - Math.abs((huePrime % 2) - 1))

    let red = 0
    let green = 0
    let blue = 0

    if (huePrime >= 0 && huePrime < 1) {
        red = chroma
        green = x
    } else if (huePrime >= 1 && huePrime < 2) {
        red = x
        green = chroma
    } else if (huePrime >= 2 && huePrime < 3) {
        green = chroma
        blue = x
    } else if (huePrime >= 3 && huePrime < 4) {
        green = x
        blue = chroma
    } else if (huePrime >= 4 && huePrime < 5) {
        red = x
        blue = chroma
    } else {
        red = chroma
        blue = x
    }

    const matchLightness = l - chroma / 2
    return [
        clampByte((red + matchLightness) * 255),
        clampByte((green + matchLightness) * 255),
        clampByte((blue + matchLightness) * 255)
    ]
}

export function normalizeLightweightChartColor(rawColor: string, contextLabel: string): string {
    const color = rawColor.trim()
    if (!color) {
        throw new Error(
            `[lightweight-chart-color] empty color is not allowed. owner=lightweight-charts | context=${contextLabel}.`
        )
    }

    if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) {
        return color
    }

    const rgbMatch = color.match(
        /^rgba?\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?:\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*)?\)$/i
    )
    if (rgbMatch) {
        const red = clampByte(parseFiniteNumber(rgbMatch[1]!, 'red'))
        const green = clampByte(parseFiniteNumber(rgbMatch[2]!, 'green'))
        const blue = clampByte(parseFiniteNumber(rgbMatch[3]!, 'blue'))
        const alpha = rgbMatch[4] == null ? 1 : clampUnitAlpha(parseFiniteNumber(rgbMatch[4]!, 'alpha'))

        return alpha === 1 ?
                `rgb(${red}, ${green}, ${blue})`
            :   `rgba(${red}, ${green}, ${blue}, ${formatAlpha(alpha)})`
    }

    const hslMatch = color.match(
        /^hsla?\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))%\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))%(?:\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*)?\)$/i
    )
    if (hslMatch) {
        const hue = parseFiniteNumber(hslMatch[1]!, 'hue')
        const saturationPct = parseFiniteNumber(hslMatch[2]!, 'saturation')
        const lightnessPct = parseFiniteNumber(hslMatch[3]!, 'lightness')
        const alpha = hslMatch[4] == null ? 1 : clampUnitAlpha(parseFiniteNumber(hslMatch[4]!, 'alpha'))
        const [red, green, blue] = hslToRgb(hue, saturationPct, lightnessPct)

        return alpha === 1 ?
                `rgb(${red}, ${green}, ${blue})`
            :   `rgba(${red}, ${green}, ${blue}, ${formatAlpha(alpha)})`
    }

    throw new Error(
        `[lightweight-chart-color] unsupported color contract. owner=lightweight-charts | expected=hex, rgb(a) or hsl(a) CSS color string | actual=${color} | requiredAction=Normalize chart color through normalizeLightweightChartColor before passing it to lightweight-charts. | context=${contextLabel}.`
    )
}
