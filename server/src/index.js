import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js';
import { clientsRouter } from './routes/clients.js';
import { proposalsRouter } from './routes/proposals.js';
import { templatesRouter } from './routes/templates.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/clients', clientsRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/templates', templatesRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));
