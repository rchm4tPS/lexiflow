import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import readerRoutes from './routes/reader.js';
import vocabRoutes from './routes/vocab.js';
import libraryRoutes from './routes/library.js';
import phrasesRoutes from './routes/phrases.js';
import uploadRoutes from './routes/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Resolve spec path from this module (works for tsx + compiled dist) and cwd fallbacks. */
function resolveOpenApiSpecPath(): string | null {
  const candidates = [
    fileURLToPath(new URL('../openapi.yaml', import.meta.url)),
    fileURLToPath(new URL('../../docs/openapi.yaml', import.meta.url)),
    path.resolve(process.cwd(), 'docs', 'openapi.yaml'),
    path.resolve(process.cwd(), 'openapi.yaml'),
    path.resolve(__dirname, '../openapi.yaml'),
    path.resolve(__dirname, '../../docs/openapi.yaml'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    console.warn('[api-docs] OpenAPI spec not found. Tried:\n  ' + candidates.join('\n  '));
  }
  return found ?? null;
}

const app = express();
app.use(cors());
app.use(express.json());

const openApiPath = resolveOpenApiSpecPath();
if (openApiPath) {
  try {
    const spec = YAML.parse(fs.readFileSync(openApiPath, 'utf8')) as Record<string, unknown>;
    // `serve` is RequestHandler[] — must be spread or Express never registers the UI (Express 5).
    const serveStack = Array.isArray(swaggerUi.serve) ? swaggerUi.serve : [swaggerUi.serve];
    app.use('/api-docs', ...serveStack, swaggerUi.setup(spec, { customSiteTitle: 'Lexiflow API' }));
    console.log(`[api-docs] Loaded OpenAPI spec from ${openApiPath}`);
  } catch (e) {
    console.warn('[api-docs] Failed to load OpenAPI spec:', e);
  }
}

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- API Versioning (v1) ---
const apiV1 = express.Router();

apiV1.use('/auth', authRoutes);
apiV1.use('/library', libraryRoutes);
apiV1.use('/lessons', readerRoutes);
apiV1.use('/vocab', vocabRoutes);
apiV1.use('/phrases', phrasesRoutes);
apiV1.use('/upload', uploadRoutes);

apiV1.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'v1', message: 'Lexiflow API v1 is running!' });
});

// Mount the v1 router onto the main app
app.use('/api/v1', apiV1);

// Production: serve Vite build (Docker copies it to ../public relative to dist/)
if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get('*', (req, res) => {
      // `/api-docs` starts with `/api` — exclude it so Swagger UI is not JSON-404'd.
      const isApiPath =
        (req.path.startsWith('/api') && !req.path.startsWith('/api-docs')) ||
        req.path.startsWith('/uploads');
      if (isApiPath) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  if (openApiPath) {
    console.log(`API docs (Swagger UI): http://0.0.0.0:${PORT}/api-docs`);
  }
});