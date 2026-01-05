import express from 'express';
import { createExpressProxy } from 'guideants/proxy/express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Check for API key
if (!process.env.GUIDEANTS_API_KEY) {
  console.error('Error: GUIDEANTS_API_KEY environment variable is required');
  console.error('Create a .env file with: GUIDEANTS_API_KEY=your-api-key');
  process.exit(1);
}

// Serve static test page
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// CORS headers for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Published-Auth');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// GuideAnts proxy at /api/guideants
// All requests to /api/guideants/* will be forwarded to the GuideAnts API
app.use('/api/guideants', createExpressProxy({
  apiKey: process.env.GUIDEANTS_API_KEY,
  targetBaseUrl: process.env.GUIDEANTS_TARGET_URL || 'https://api.guideants.ai',
  
  logger: {
    info: (msg, meta) => console.log(`[Proxy] ${msg}`, meta ? JSON.stringify(meta) : ''),
    warn: (msg, meta) => console.warn(`[Proxy] ${msg}`, meta ? JSON.stringify(meta) : ''),
    error: (msg, meta) => console.error(`[Proxy] ${msg}`, meta ? JSON.stringify(meta) : ''),
  },
  
  metrics: {
    onRequest: (info) => {
      console.log(`[Metrics] Request: ${info.method} ${info.path}${info.pubId ? ` (pubId: ${info.pubId})` : ''}`);
    },
    onResponse: (info) => {
      console.log(`[Metrics] Response: ${info.status} in ${info.durationMs}ms`);
    },
    onStreamChunk: (info) => {
      // Uncomment for verbose streaming logs
      // console.log(`[Metrics] Stream chunk: ${info.bytes} bytes`);
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 GuideAnts Node.js Proxy Harness running at http://localhost:${PORT}`);
  console.log(`\n   Static files: http://localhost:${PORT}/`);
  console.log(`   Proxy endpoint: http://localhost:${PORT}/api/guideants`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`\n   Target API: ${process.env.GUIDEANTS_TARGET_URL || 'https://api.guideants.ai'}`);
  console.log('');
});


