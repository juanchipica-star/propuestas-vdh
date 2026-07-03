import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';
import { clientsRouter } from './routes/clients.js';
import { proposalsRouter } from './routes/proposals.js';
import { templatesRouter } from './routes/templates.js';
import { pricingRouter } from './routes/pricing.js';
import { paths } from './fileStorage.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/clients', clientsRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/pricing', pricingRouter);

const FILE_DIRS = { templates: paths.templatesDir, proposals: paths.proposalsDir };

app.get('/api/files/:kind/:filename', (req, res) => {
  const dir = FILE_DIRS[req.params.kind];
  if (!dir) return res.status(404).json({ error: 'Tipo de archivo desconocido' });

  const filePath = path.join(dir, req.params.filename);
  if (!filePath.startsWith(dir)) return res.status(400).json({ error: 'Ruta invalida' });

  res.download(filePath, req.params.filename, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Archivo no encontrado' });
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// En produccion, el build del frontend (client/dist) se sirve desde este mismo servidor:
// un solo servicio para desplegar, sin depender de otro host ni de CORS.
const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));
