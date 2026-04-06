import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

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

const app = express();
app.use(cors());
app.use(express.json());

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
  res.json({ status: 'ok', version: 'v1', message: 'LingQ Clone API v1 is running!' });
});

// Mount the v1 router onto the main app
app.use('/api/v1', apiV1);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});