import { defineConfig, loadEnv } from 'vite'
import { plugins, css, alias } from './config'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const devApiProxyTarget = env.VITE_DEV_API_PROXY_TARGET?.trim() || 'http://localhost:10000'

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
