import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Separamos las librerías grandes en chunks propios. No reduce el peso
        // total, pero: (1) reparte el bundle en piezas < 500 KB (silencia el
        // aviso de Vite), y (2) mejora el cacheo en visitas repetidas — al
        // publicar cambios de la app, el navegador no re-descarga React ni
        // Supabase, que casi nunca cambian.
        // Orden importante: 'lucide-react' contiene la subcadena 'react', así
        // que se comprueba antes que el chunk genérico de react.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'vendor-charts';
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
});
