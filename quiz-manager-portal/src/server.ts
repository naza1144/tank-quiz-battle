import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  const fallback = path.join(__dirname, '..', 'src', 'public');
  if (fs.existsSync(path.join(fallback, 'index.html'))) {
    publicPath = fallback;
  }
}

// Health check
app.get(['/quiz-portal/health', '/api/quiz-portal/health', '/health'], (_req, res) => {
  res.json({
    status: 'ok',
    service: 'tank-quiz-manager-portal',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Serve static assets both under /quiz-portal prefix and root
app.use('/quiz-portal', express.static(publicPath));
app.use(express.static(publicPath));

app.get(['/quiz-portal', '/quiz-portal/*', '/'], (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[QuizManagerPortal] 🚀 Teacher/Admin Portal running on http://localhost:${PORT}`);
});
