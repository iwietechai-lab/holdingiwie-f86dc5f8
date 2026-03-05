import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.png", "robots.txt"],
      manifest: {
        name: "IwieChat - Mensajería y Videollamadas",
        short_name: "IwieChat",
        description: "App de mensajería y videollamadas empresariales del Holding Iwie",
        theme_color: "#6366f1",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "portrait",
        start_url: "/iwiechat",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        categories: ["business", "productivity", "communication"],
        shortcuts: [
          {
            name: "Chats",
            short_name: "Chats",
            description: "Ver mis chats",
            url: "/iwiechat?tab=chats",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Videollamadas",
            short_name: "Llamadas",
            description: "Ver mis videollamadas",
            url: "/iwiechat?tab=calls",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB limit
        runtimeCaching: [
          {
            // Block caching for sensitive Supabase API routes (auth, data, storage)
            urlPattern: /^https:\/\/svrrliskjlpmsofjjqrx\.supabase\.co\/(rest|storage|auth|functions)\/v1\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Only cache static Supabase assets (e.g. public bucket images served via /object/public/)
            urlPattern: /^https:\/\/svrrliskjlpmsofjjqrx\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-public-assets",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours for public assets only
              },
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'face-api': ['@vladmandic/face-api'],
          'recharts': ['recharts'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
