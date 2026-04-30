import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    allowedHosts: [
      'watchme-log.vercel.app'
    ],
    proxy: {
      '/api/tmdb': {
        target: 'https://api.themoviedb.org/3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tmdb/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || '1183ccd173f0d86021d3af92e6af1e70';
            proxyReq.path += (proxyReq.path.includes('?') ? '&' : '?') + `api_key=${TMDB_API_KEY}`;
            
            // Auto inject credits for movie details
            if (proxyReq.path.match(/^\/movie\/[0-9]+(\?|$)/)) {
              proxyReq.path += (proxyReq.path.includes('?') ? '&' : '?') + 'append_to_response=credits';
            }
          });
        }
      },
      '/api/tvmaze': {
        target: 'https://api.tvmaze.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tvmaze/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Auto inject embeds for show details
            if (proxyReq.path.match(/^\/shows\/[0-9]+(\?|$)/)) {
              proxyReq.path += (proxyReq.path.includes('?') ? '&' : '?') + 'embed[]=nextepisode&embed[]=previousepisode&embed[]=cast';
            }
          });
        }
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
}));
