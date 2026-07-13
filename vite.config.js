import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  // PORT приходит от превью Claude Code, когда 5173 занят другим чатом
  server: { port: Number(process.env.PORT) || 5173 },
})