import { Router } from 'express';
import { db } from '../db.js';
import { generateProposalFile, fileUrlFor } from '../fileStorage.js';
import { calculateFee } from './pricing.js';

export const proposalsRouter = Router();

const VALID_STATUSES = ['borrador', 'enviada', 'pendiente', 'aprobada', 'rechazada'];

async function recordStatusChange(proposalId, status) {
  await db.prepare('INSERT INTO proposal_status_history (proposal_id, status) VALUES (?, ?)').run(
    proposalId,
    status
  );
}

function withFileUrl(proposal) {
  if (!proposal) return proposal;
  return { ...proposal, file_url: fileUrlFor(proposal.file_path) };
}

proposalsRouter.get('/', async (req, res) => {
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

  const proposals = await db
    .prepare(
      `SELECT p.*, c.name AS client_name
       FROM proposals p
       JOIN clients c ON c.id = p.client_id
       ${where}
       ORDER BY p.updated_at DESC`
    )
    .all(params);

  res.json(proposals.map(withFileUrl));
});

proposalsRouter.get('/:id', async (req, res) => {
  const proposal = await db
    .prepare(
      `SELECT p.*, c.name AS client_name
       FROM proposals p
       JOIN clients c ON c.id = p.client_id
       WHERE p.id = ?`
    )
    .get(req.params.id);

  if (!proposal) return res.status(404).json({ error: 'Propuesta no encontrada' });

  const history = await db
    .prepare('SELECT * FROM proposal_status_history WHERE proposal_id = ? ORDER BY changed_at DESC')
    .all(req.params.id);

  res.json({ ...withFileUrl(proposal), history });
});

proposalsRouter.post('/', async (req, res) => {
  const { client_id, title, drive_file_id, drive_link, template_id, notes } = req.body;
  if (!client_id || !title || !title.trim()) {
    return res.status(400).json({ error: 'client_id y title son requeridos' });
  }

  const result = await db
    .prepare(
      `INSERT INTO proposals (client_id, template_id, title, drive_file_id, drive_link, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(client_id, template_id || null, title.trim(), drive_file_id || null, drive_link || null, notes || null);

  await recordStatusChange(result.lastInsertRowid, 'borrador');

  const proposal = await db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(proposal);
});

// Crea una propuesta nueva a partir de una plantilla: la copia en Drive si esta
// configurado, o localmente (completando el nombre del cliente cuando el placeholder
// de portada lo permite). Si se manda base_salary/fee_pct, calcula y guarda el
// desglose de honorarios como snapshot (no se escribe en el PPT).
proposalsRouter.post('/from-template', async (req, res) => {
  const { template_id, client_id, title, base_salary, payments_per_year, bonus_pct, fee_pct } = req.body;
  if (!template_id || !client_id || !title || !title.trim()) {
    return res.status(400).json({ error: 'template_id, client_id y title son requeridos' });
  }

  const template = await db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  const client = await db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
  if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  try {
    const file = await generateProposalFile(template, { clientName: client.name, title: title.trim() });

    const pricingSnapshot =
      base_salary && fee_pct
        ? calculateFee({ base_salary, payments_per_year, bonus_pct, fee_pct })
        : null;

    const result = await db
      .prepare(
        `INSERT INTO proposals (
           client_id, template_id, title, service_type, drive_file_id, drive_link, file_path,
           base_salary, payments_per_year, bonus_pct, fee_pct, pricing_snapshot, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador')`
      )
      .run(
        client_id,
        template_id,
        title.trim(),
        template.service_type,
        file.drive_file_id,
        file.drive_link,
        file.file_path,
        base_salary || null,
        payments_per_year || null,
        bonus_pct || null,
        fee_pct || null,
        pricingSnapshot ? JSON.stringify(pricingSnapshot) : null
      );

    await recordStatusChange(result.lastInsertRowid, 'borrador');

    const proposal = await db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...withFileUrl(proposal), filledClientName: file.filledClientName });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: `No se pudo generar la propuesta: ${err.message}` });
  }
});

proposalsRouter.put('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Propuesta no encontrada' });

  const { title, drive_file_id, drive_link, notes } = req.body;
  await db.prepare(
    `UPDATE proposals SET title = ?, drive_file_id = ?, drive_link = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title?.trim() || existing.title,
    drive_file_id ?? existing.drive_file_id,
    drive_link ?? existing.drive_link,
    notes ?? existing.notes,
    req.params.id
  );

  const updated = await db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  res.json(updated);
});

proposalsRouter.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status debe ser uno de: ${VALID_STATUSES.join(', ')}` });
  }

  const existing = await db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Propuesta no encontrada' });

  const now = new Date().toISOString();
  const sentAt = status === 'enviada' && !existing.sent_at ? now : existing.sent_at;
  const respondedAt = ['aprobada', 'rechazada'].includes(status) ? now : existing.responded_at;

  await db.prepare(
    `UPDATE proposals SET status = ?, sent_at = ?, responded_at = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(status, sentAt, respondedAt, req.params.id);

  await recordStatusChange(req.params.id, status);

  const updated = await db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  res.json(updated);
});
