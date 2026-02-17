import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  
  return {
    plugins: [react(), basicSsl()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_PROXY_BASE_URL,
          changeOrigin: true,
          secure: false,
        },
        '/images': {
          target: env.VITE_PROXY_BASE_URL,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
