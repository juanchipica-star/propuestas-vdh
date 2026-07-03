import { Router } from 'express';
import { db } from '../db.js';
import { listFilesInFolder, isDriveConfigured } from '../googleDrive.js';
import { fileUrlFor } from '../fileStorage.js';

export const templatesRouter = Router();

const SERVICE_TYPE_LABELS = {
  coaching: 'Coaching',
  executive_search: 'Executive Search',
  talent_acquisition: 'Talent Acquisition',
  talent_search: 'Talent Search',
  market_insights: 'Market Insights',
  assessment: 'Assessment',
  selfplacement: 'Selfplacement',
  future_quest: 'Future Quest',
  institucional: 'Institucional',
};

function withExtras(template) {
  return {
    ...template,
    file_url: fileUrlFor(template.file_path),
    service_type_label: SERVICE_TYPE_LABELS[template.service_type] || template.service_type,
  };
}

// Lista las plantillas guardadas en la BD. Si Drive esta configurado y hay una carpeta
// de plantillas definida, sincroniza primero los archivos nuevos encontrados en Drive.
templatesRouter.get('/', async (req, res) => {
  const folderId = process.env.DRIVE_TEMPLATES_FOLDER_ID;

  if (isDriveConfigured() && folderId) {
    try {
      const files = await listFilesInFolder(folderId);
      const upsert = db.prepare(
        `INSERT INTO templates (name, drive_file_id, drive_link)
         VALUES (@name, @drive_file_id, @drive_link)
         ON CONFLICT(drive_file_id) DO UPDATE SET name = excluded.name, drive_link = excluded.drive_link`
      );
      const upsertMany = db.transaction((rows) => rows.forEach((row) => upsert.run(row)));
      upsertMany(
        files.map((f) => ({ name: f.name, drive_file_id: f.id, drive_link: f.webViewLink || null }))
      );
    } catch (err) {
      console.error('No se pudo sincronizar con Google Drive:', err.message);
    }
  }

  const templates = db.prepare('SELECT * FROM templates ORDER BY name COLLATE NOCASE').all();
  res.json({ templates: templates.map(withExtras), driveConfigured: isDriveConfigured() && Boolean(folderId) });
});

templatesRouter.post('/', (req, res) => {
  const { name, drive_file_id, drive_link, category, description } = req.body;
  if (!name || !drive_file_id) {
    return res.status(400).json({ error: 'name y drive_file_id son requeridos' });
  }

  const result = db
    .prepare(
      `INSERT INTO templates (name, drive_file_id, drive_link, category, description)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, drive_file_id, drive_link || null, category || null, description || null);

  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(template);
});
