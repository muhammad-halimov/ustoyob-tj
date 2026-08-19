import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  
  return {
    plugins: [react(), basicSsl()],
    esbuild: {
      // Strip all console.* and debugger statements in production builds
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_PROXY_BASE_URL,
          changeOrigin: true,
          secure: false,
          // The refresh-token cookie (Gesdinet, §1) comes back from the proxy target
          // (VITE_PROXY_BASE_URL, e.g. admin.ustoyob.tj) scoped to *that* domain via
          // Set-Cookie's Domain attribute — but the browser only ever sees this dev
          // server's own origin, since the proxy is transparent to it. A Domain that
          // doesn't match (or isn't a parent of) the requesting host gets silently
          // rejected by the browser, so the cookie never actually gets stored — which is
          // exactly why POST /refresh_token later 401s with "Missing JWT Refresh Token".
          // Stripping Domain here lets the browser default it to the actual dev origin.
          cookieDomainRewrite: '',
        },
        '/uploads': {
          target: env.VITE_PROXY_BASE_URL,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
