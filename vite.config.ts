import { defineConfig, loadEnv } from 'vite'
import { plugins, css, alias } from './config'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const devApiProxyTarget = env.VITE_DEV_API_PROXY_TARGET?.trim() || 'https://solsignalmodel1d-backtest-backend.onrender.com'

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
