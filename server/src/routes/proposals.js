import { Router } from 'express';
import { db } from '../db.js';
import { copyFile } from '../googleDrive.js';

export const proposalsRouter = Router();

const VALID_STATUSES = ['borrador', 'enviada', 'pendiente', 'aprobada', 'rechazada'];

function recordStatusChange(proposalId, status) {
  db.prepare('INSERT INTO proposal_status_history (proposal_id, status) VALUES (?, ?)').run(
    proposalId,
    status
  );
}

proposalsRouter.get('/', (req, res) => {
  const { status, client_id, q } = req.query;
  const clauses = [];
  const params = {};

  if (status) {
    clauses.push('p.status = @status');
    params.status = status;
  }
  if (client_id) {
    clauses.push('p.client_id = @client_id');
    params.client_id = client_id;
  }
  if (q) {
    clauses.push('(p.title LIKE @q OR c.name LIKE @q)');
    params.q = `%${q}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const proposals = db
    .prepare(
      `SELECT p.*, c.name AS client_name
       FROM proposals p
       JOIN clients c ON c.id = p.client_id
       ${where}
       ORDER BY p.updated_at DESC`
    )
    .all(params);

  res.json(proposals);
});

proposalsRouter.get('/:id', (req, res) => {
  const proposal = db
    .prepare(
      `SELECT p.*, c.name AS client_name
       FROM proposals p
       JOIN clients c ON c.id = p.client_id
       WHERE p.id = ?`
    )
    .get(req.params.id);

  if (!proposal) return res.status(404).json({ error: 'Propuesta no encontrada' });

  const history = db
    .prepare('SELECT * FROM proposal_status_history WHERE proposal_id = ? ORDER BY changed_at DESC')
    .all(req.params.id);

  res.json({ ...proposal, history });
});

proposalsRouter.post('/', (req, res) => {
  const { client_id, title, drive_file_id, drive_link, template_id, notes } = req.body;
  if (!client_id || !title || !title.trim()) {
    return res.status(400).json({ error: 'client_id y title son requeridos' });
  }

  const result = db
    .prepare(
      `INSERT INTO proposals (client_id, template_id, title, drive_file_id, drive_link, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(client_id, template_id || null, title.trim(), drive_file_id || null, drive_link || null, notes || null);

  recordStatusChange(result.lastInsertRowid, 'borrador');

  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(proposal);
});

// Crea una propuesta nueva copiando una plantilla existente de Google Drive.
proposalsRouter.post('/from-template', async (req, res) => {
  const { template_id, client_id, title } = req.body;
  if (!template_id || !client_id || !title || !title.trim()) {
    return res.status(400).json({ error: 'template_id, client_id y title son requeridos' });
  }

  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
  if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  try {
    const destFolderId = process.env.DRIVE_PROPOSALS_FOLDER_ID || undefined;
    const copy = await copyFile(template.drive_file_id, title.trim(), destFolderId);

    const result = db
      .prepare(
        `INSERT INTO proposals (client_id, template_id, title, drive_file_id, drive_link, status)
         VALUES (?, ?, ?, ?, ?, 'borrador')`
      )
      .run(client_id, template_id, title.trim(), copy.id, copy.webViewLink || null);

    recordStatusChange(result.lastInsertRowid, 'borrador');

    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(proposal);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: `No se pudo copiar la plantilla en Google Drive: ${err.message}` });
  }
});

proposalsRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Propuesta no encontrada' });

  const { title, drive_file_id, drive_link, notes } = req.body;
  db.prepare(
    `UPDATE proposals SET title = ?, drive_file_id = ?, drive_link = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title?.trim() || existing.title,
    drive_file_id ?? existing.drive_file_id,
    drive_link ?? existing.drive_link,
    notes ?? existing.notes,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  res.json(updated);
});

proposalsRouter.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status debe ser uno de: ${VALID_STATUSES.join(', ')}` });
  }

  const existing = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Propuesta no encontrada' });

  const now = new Date().toISOString();
  const sentAt = status === 'enviada' && !existing.sent_at ? now : existing.sent_at;
  const respondedAt = ['aprobada', 'rechazada'].includes(status) ? now : existing.responded_at;

  db.prepare(
    `UPDATE proposals SET status = ?, sent_at = ?, responded_at = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(status, sentAt, respondedAt, req.params.id);

  recordStatusChange(req.params.id, status);

  const updated = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  res.json(updated);
});
