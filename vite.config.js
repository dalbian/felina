import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Code-splitting de vendors con sintaxis de objeto (no función).
        // Indica a Vite/Rollup qué packages top-level entran en cada chunk;
        // Rollup resuelve dependencias transitivas SIN crear ciclos (la
        // sintaxis función anterior daba el warning circular vendor↔vendor-react
        // y rompía la app en producción al añadir recharts).
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
