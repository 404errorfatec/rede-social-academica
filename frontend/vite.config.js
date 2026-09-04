import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em dev, o front roda na 5173 e chama a API na 3001 (ver src/api.js).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
