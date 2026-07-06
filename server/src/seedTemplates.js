import fs from 'node:fs';
import path from 'node:path';
import { db } from './db.js';
import { paths } from './fileStorage.js';
import { TEMPLATE_CATALOG, SEED_PROPOSAL } from './templateCatalog.js';

const serverRoot = path.join(paths.templatesDir, '..', '..');
const seedDir = path.join(serverRoot, 'assets', 'seed');

// Puebla la base con las plantillas VDH (ya versionadas en server/assets/templates) y la
// propuesta historica de ejemplo, solo si la tabla de plantillas esta vacia. Con una base
// persistente (Turso/Render) esto corre una unica vez en la vida de la base.
export async function seedTemplatesIfEmpty() {
  const { count } = await db.prepare('SELECT COUNT(*) AS count FROM templates').get();
  if (count > 0) return;

  const insertTemplate = db.prepare(
    `INSERT INTO templates (name, service_type, language, has_client_placeholder, file_path, category)
     VALUES (@name, @service_type, @language, @has_client_placeholder, @file_path, @category)`
  );

  for (const t of TEMPLATE_CATALOG) {
    const filePath = path.join(paths.templatesDir, `${t.name}.pptx`);
    if (!fs.existsSync(filePath)) {
      console.warn(`Seed: falta el archivo de plantilla ${filePath}`);
      continue;
    }
    await insertTemplate.run({
      name: t.name,
      service_type: t.service_type,
      language: t.language,
      has_client_placeholder: t.has_client_placeholder,
      file_path: filePath,
      category: t.category,
    });
  }

  const seedSourcePath = path.join(seedDir, SEED_PROPOSAL.file);
  if (fs.existsSync(seedSourcePath)) {
    const { lastInsertRowid: clientId } = await db
      .prepare('INSERT INTO clients (name) VALUES (?)')
      .run(SEED_PROPOSAL.clientName);
    const template = await db
      .prepare('SELECT id FROM templates WHERE name = ?')
      .get(SEED_PROPOSAL.templateName);

    const destPath = path.join(paths.proposalsDir, SEED_PROPOSAL.file);
    fs.copyFileSync(seedSourcePath, destPath);

    const result = await db
      .prepare(
        `INSERT INTO proposals (client_id, template_id, title, service_type, file_path, status, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        clientId,
        template?.id || null,
        SEED_PROPOSAL.title,
        SEED_PROPOSAL.serviceType,
        destPath,
        SEED_PROPOSAL.status,
        SEED_PROPOSAL.sentAt
      );

    await db
      .prepare('INSERT INTO proposal_status_history (proposal_id, status, changed_at) VALUES (?, ?, ?)')
      .run(result.lastInsertRowid, SEED_PROPOSAL.status, SEED_PROPOSAL.sentAt);
  }

  console.log(`Seed: ${TEMPLATE_CATALOG.length} plantillas cargadas.`);
}
