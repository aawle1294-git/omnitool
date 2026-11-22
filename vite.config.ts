import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import path from 'path';
import { registerMediaBridge } from './src/server/mediaBridge';

// COOP/COEP headers plugin for FFmpeg SharedArrayBuffer support
const coepPlugin = () => ({
  name: 'configure-response-headers',
  configureServer(server: any) {
    server.middlewares.use((_req: any, res: any, next: any) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      next();
    });
  },
});

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    plugins: [
      react(),
      isDev && coepPlugin(),
      isDev && {
        name: 'installer-bridge',
        configureServer(server: any) {
          server.middlewares.use('/api/launch-installer', (req: any, res: any) => {
            const wizardPath = path.resolve(__dirname, 'installer_wizard.pyw');
            try {
              const child = spawn('pythonw.exe', [wizardPath], {
                detached: true,
                stdio: 'ignore'
              });
              child.unref();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Installer launched' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });

          // Register native in-app media downloader bridge
          registerMediaBridge(server);
        }
      }
    ].filter(Boolean),
    server: {
      port: 3000,
      host: true,
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            'pdf-engine': ['pdfjs-dist', 'pdf-lib'],
            'vendor': ['react', 'react-dom', 'jszip', 'file-saver', 'qrcode']
          }
        }
      }
    }
  };
});
