import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [react()];
  
  if (mode === 'development') {
    import("lovable-tagger").then(({ componentTagger }) => {
      // @ts-ignore - componentTagger may return Plugin or Plugin[]
      plugins.push(componentTagger());
    });
  }

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      // Exclude qr-scanner from optimization to avoid worker issues
      exclude: ['qr-scanner']
    },
    esbuild: {
      // Remove console.* and debugger statements in production
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  };
});
