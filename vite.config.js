import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'video-upload-api',
      configureServer(server) {
        // Ensure folder exists on server start
        const uploadDir = path.resolve(__dirname, 'public/college-videos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/api/upload') && req.method === 'POST') {
            const urlObj = new URL(req.url, 'http://localhost');
            const filename = urlObj.searchParams.get('filename') || `video_${Date.now()}.mp4`;

            const chunks = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
              const buffer = Buffer.concat(chunks);

              // Server-side limit validation: 100MB
              if (buffer.length > 100 * 1024 * 1024) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'File size exceeds 100MB limit' }));
                return;
              }

              const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
              const destPath = path.join(uploadDir, safeFilename);

              try {
                fs.writeFileSync(destPath, buffer);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  success: true, 
                  url: `/college-videos/${safeFilename}` 
                }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to write file to disk' }));
              }
            });

            req.on('error', (err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
