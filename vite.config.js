import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// base relativa: funciona en https://santiagoasdf.github.io/<repo>/ sin saber el nombre del repo.
export default defineConfig({
  base: './',
  plugins: [preact()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    sourcemap: false,
  },
});
