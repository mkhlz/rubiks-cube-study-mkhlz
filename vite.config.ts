import { defineConfig } from 'vite';

export default defineConfig({
  base: '/rubiks-cube-study-mkhlz/',
  build: { chunkSizeWarningLimit: 900 },
  test: { include: ['tests/**/*.test.ts'] },
} as any);
