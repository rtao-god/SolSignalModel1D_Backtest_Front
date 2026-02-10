import { defineConfig, loadEnv } from 'vite'
import { plugins, css, alias } from './config'

function resolveDevApiProxyTarget(rawTarget: string | undefined): string {
    const fallback = 'http://localhost:10000'
    const normalized = rawTarget?.trim().replace(/\/+$/, '').replace(/\/api$/i, '') ?? ''
    if (!normalized) return fallback

    const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `http://${normalized}`

    try {
        const host = new URL(withProtocol).hostname
        if (/onrender\.com$/i.test(host)) return fallback
        return withProtocol
    } catch {
        return fallback
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const devApiProxyTarget = resolveDevApiProxyTarget(env.VITE_DEV_API_PROXY_TARGET)

    return {
        plugins,
        css,
        resolve: alias,
        server: {
            proxy: {
                '/api': {
                    target: devApiProxyTarget,
                    changeOrigin: true
                }
            }
        }
    }
})
