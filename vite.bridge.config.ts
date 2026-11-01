import { defineConfig } from 'vite';
export default defineConfig({ build: { ssr: 'src/bridge.ts', outDir: 'godot/sidecar', emptyOutDir: true, target: 'node18', rollupOptions: { output: { entryFileNames: 'bridge.mjs', format: 'es' } } }, ssr: { noExternal: true } });
