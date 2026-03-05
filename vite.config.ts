import { defineConfig, loadEnv } from 'vite'
import { plugins, css, alias } from './config'

function resolveDevApiProxyTarget(rawTarget: string | undefined): string {
    const fallback = 'http://localhost:10000'
    const normalized = rawTarget?.trim().replace(/\/+$/, '').replace(/\/api$/i, '') ?? ''
    if (!normalized) return fallback

    const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `http://${normalized}`

    try {
        new URL(withProtocol)
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
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (!id.includes('node_modules')) {
                            return
                        }

                        if (
                            id.includes('jspdf') ||
                            id.includes('jspdf-autotable') ||
                            id.includes('html2canvas')
                        ) {
                            return 'vendor-export'
                        }

                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                            return 'vendor-react'
                        }

                        if (
                            id.includes('@reduxjs/toolkit') ||
                            id.includes('react-redux') ||
                            id.includes('@tanstack/react-query')
                        ) {
                            return 'vendor-state'
                        }

                        if (id.includes('i18next') || id.includes('react-i18next')) {
                            return 'vendor-i18n'
                        }
                    }
                }
            }
        },
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
