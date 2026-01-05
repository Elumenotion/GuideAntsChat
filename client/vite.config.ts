import { defineConfig } from 'vite';
import { resolve } from 'path';

// Browser build configuration
const browserConfig = defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    // Replace free identifiers used by some deps (e.g., mermaid/dagre) at build time
    global: 'window',
    process: '{"env":{}}',
  },
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    lib: {
      entry: 'src/GuideantsChat.ts',
      name: 'GuideantsChat',
      fileName: (format) => `guideants-chat.${format}.js`,
      formats: ['es', 'iife']
    },
    rollupOptions: {
      output: {
        globals: {},
        banner: `(function(){try{var g=typeof globalThis!=='undefined'?globalThis:window;if(!g.process){g.process={env:{}};}if(!g.global){g.global=g;}}catch(e){}})();`,
        inlineDynamicImports: true
      }
    },
    sourcemap: true
  }
});

// Proxy build configuration (Node.js)
const proxyConfig = defineConfig({
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
      external: ['express', 'http', 'https', 'stream', 'url', 'querystring'],
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
    emptyOutDir: false
  }
});

// Default export for the main browser build
export default browserConfig;


