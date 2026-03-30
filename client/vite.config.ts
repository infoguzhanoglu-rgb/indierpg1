import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      // Üst dizindeki 'shared' klasörüne erişim izni veriyoruz
      allow: ['..']
    }
  }
});
