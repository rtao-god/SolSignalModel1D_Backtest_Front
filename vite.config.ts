/// <reference types="vitest/config" />
import type { Server as HttpProxyServer } from 'http-proxy'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { UserConfig } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { plugins, css, alias } from './config'
import { writeDevApiProxyErrorResponse } from './config/vite/devApiProxy'
import { resolveDevApiProxyTarget } from './config/vite/devProxyTarget'
import { resolveFrontendProjectPaths } from './config/vite/projectPaths'

export default defineConfig(({ mode }): UserConfig => {
    const projectPaths = resolveFrontendProjectPaths()
    const env = loadEnv(mode, projectPaths.rootDir, '')
    // Dev startup фронта должен быть изолирован от lifecycle backend-а:
    // Vite поднимается сразу, а target для `/api` задаётся только простым proxy-контрактом.
    const devApiProxyTarget = resolveDevApiProxyTarget(env.VITE_DEV_API_PROXY_TARGET)

    return {
        root: projectPaths.rootDir,
        envDir: projectPaths.rootDir,
        cacheDir: projectPaths.viteCacheDir,
        plugins,
        css,
        resolve: alias,
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id: string) {
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
                    changeOrigin: true,
                    configure(proxy: HttpProxyServer<IncomingMessage, ServerResponse<IncomingMessage>>) {
                        proxy.on('error', (
                            error: Error & { code?: string },
                            req: IncomingMessage,
                            res: ServerResponse<IncomingMessage>
                        ) => {
                            writeDevApiProxyErrorResponse({
                                target: devApiProxyTarget,
                                req,
                                res,
                                error
                            })
                        })
                    }
                }
            }
        },
        test: {
            globals: true,
            environment: 'jsdom',
            css: true
        }
    }
})
