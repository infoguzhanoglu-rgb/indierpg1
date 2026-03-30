/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      // Üst dizindeki 'shared' klasörüne erişim izni veriyoruz
      allow: ['..']
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
  }
});
