import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: '.tmp-old',
    envDir: process.cwd(),
    define: {
      'import.meta.env': JSON.stringify(env),
    },
    build: {
      outDir: '../dist-old',
      emptyOutDir: true,
    },
  };
});
