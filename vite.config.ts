import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const baseConfig = {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
  };

  if (command === 'build') {
    return {
      ...baseConfig,
      base: '/Fluxos/',
    };
  }

  return baseConfig;
});