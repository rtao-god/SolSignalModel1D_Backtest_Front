/// <reference types="vitest/config" />
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Server as HttpProxyServer } from 'http-proxy'
import type { Connect, Plugin, UserConfig, ViteDevServer } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { plugins, css, alias } from './config'
import { writeDevApiProxyErrorResponse } from './config/vite/devApiProxy'
import {
    buildLocalApiRuntimeFailurePayload,
    ensureManagedLocalApiReady,
    readLocalApiRuntimeContract
} from './config/vite/localApiRuntime'

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
    const env = loadEnv(mode, process.cwd(), '')
    const isVitestRuntime = process.env.VITEST === 'true'
    const isDevServer = command === 'serve' && mode !== 'production' && mode !== 'test' && !isVitestRuntime
    // Локальный dev-server не должен жить отдельно от backend owner-profile:
    // если API ещё не поднят, Vite сначала доводит до готовности этот host, а уже потом принимает `/api` трафик.
    const localApiRuntimeContract = isDevServer ? readLocalApiRuntimeContract() : null
    const devApiProxyTarget = localApiRuntimeContract
        ? await ensureManagedLocalApiReady({
              rawTarget: env.VITE_DEV_API_PROXY_TARGET,
              contract: localApiRuntimeContract
          })
        : null
    const managedLocalApiRuntimePlugin: Plugin | null = localApiRuntimeContract && devApiProxyTarget
        ? {
              name: 'managed-local-api-runtime',
              configureServer(server: ViteDevServer) {
                  // Один startup-check недостаточен: если локальный backend упал после boot,
                  // первый же `/api` запрос должен поднять owner-host заново, а не деградировать в proxy-only 502.
                  server.middlewares.use(async (
                      req: IncomingMessage,
                      res: ServerResponse<IncomingMessage>,
                      next: Connect.NextFunction
                  ) => {
                      if (!req.url?.startsWith('/api')) {
                          next()
                          return
                      }

                      try {
                          await ensureManagedLocalApiReady({
                              rawTarget: env.VITE_DEV_API_PROXY_TARGET,
                              contract: localApiRuntimeContract
                          })
                          next()
                      } catch (error) {
                          if (res.headersSent) {
                              return
                          }

                          const payload = buildLocalApiRuntimeFailurePayload({
                              error,
                              req,
                              target: devApiProxyTarget
                          })

                          res.statusCode = payload.status
                          res.setHeader('Content-Type', 'application/json; charset=utf-8')
                          res.end(JSON.stringify(payload))
                      }
                  })
              }
          }
        : null

    return {
        plugins: managedLocalApiRuntimePlugin
            ? [...plugins, managedLocalApiRuntimePlugin]
            : plugins,
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
        server: devApiProxyTarget
            ? {
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
              }
            : undefined,
        test: {
            globals: true,
            environment: 'jsdom',
            css: true
        }
    }
})
