import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// Proxy build configuration (Node.js)
export default defineConfig({
  plugins: [
    dts({
      include: ['src/proxy/**/*.ts'],
      outDir: 'dist/proxy',
      rollupTypes: false
    })
  ],
  build: {
    outDir: 'dist/proxy',
    lib: {
      entry: {
        index: resolve(__dirname, 'src/proxy/index.ts'),
        express: resolve(__dirname, 'src/proxy/express.ts'),
        core: resolve(__dirname, 'src/proxy/core.ts'),
        types: resolve(__dirname, 'src/proxy/types.ts'),
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['express', 'http', 'https', 'stream', 'url', 'querystring', 'buffer'],
      output: [
        {
          format: 'es',
          entryFileNames: '[name].js',
          chunkFileNames: '[name]-[hash].js',
          dir: 'dist/proxy'
        },
        {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name]-[hash].cjs',
          dir: 'dist/proxy'
        }
      ]
    },
    sourcemap: true,
    emptyOutDir: true,
    target: 'node18'
  }
});




