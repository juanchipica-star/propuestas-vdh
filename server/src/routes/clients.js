import { Router } from 'express';
import { db } from '../db.js';

export const clientsRouter = Router();

clientsRouter.get('/', (req, res) => {
  const clients = db
    .prepare(
      `SELECT c.*, COUNT(p.id) AS proposal_count
       FROM clients c
       LEFT JOIN proposals p ON p.client_id = c.id
       GROUP BY c.id
       ORDER BY c.name COLLATE NOCASE`
    )
    .all();
  res.json(clients);
});

clientsRouter.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  const proposals = db
    .prepare('SELECT * FROM proposals WHERE client_id = ? ORDER BY created_at DESC')
    .all(req.params.id);

  res.json({ ...client, proposals });
});

clientsRouter.post('/', (req, res) => {
  const { name, contact_name, email, phone, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del cliente es requerido' });
  }

  const result = db
    .prepare(
      `INSERT INTO clients (name, contact_name, email, phone, notes) VALUES (?, ?, ?, ?, ?)`
    )
    .run(name.trim(), contact_name || null, email || null, phone || null, notes || null);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(client);
});

clientsRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

  const { name, contact_name, email, phone, notes } = req.body;
  db.prepare(
    `UPDATE clients SET name = ?, contact_name = ?, email = ?, phone = ?, notes = ? WHERE id = ?`
  ).run(
    name?.trim() || existing.name,
    contact_name ?? existing.contact_name,
    email ?? existing.email,
    phone ?? existing.phone,
    notes ?? existing.notes,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json(updated);
});
