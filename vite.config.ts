import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 5180 para não brigar com outros projetos Vite que usam a 5173
  server: { host: true, port: 5180 },
});
