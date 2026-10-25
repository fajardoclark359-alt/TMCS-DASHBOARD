import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['react-icons/fi'],
          'darkweb': ['./src/pages/DarkWebMonitor.jsx'],
          'threat': ['./src/pages/ThreatDashboard.jsx'],
          'email': ['./src/pages/EmailSearch.jsx'],
          'domain': ['./src/pages/DomainSearch.jsx'],
          'phone': ['./src/pages/PhoneSearch.jsx'],
          'url': ['./src/pages/URLInvestigation.jsx'],
          'media': ['./src/pages/MediaForensics.jsx'],
          'username': ['./src/pages/UsernameSearch.jsx'],
          'gov': ['./src/pages/GovMonitor.jsx'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})