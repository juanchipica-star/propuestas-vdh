// Ejecutar con: npm run import-vdh -- "C:\Users\DELL\Downloads\Propuestas VDH"
// Copia las plantillas maestras reales de VDH a server/data/files/templates, las registra
// en la base y carga la propuesta ya enviada (Desol / Market Insights) como historial.
import fs from 'node:fs';
import path from 'node:path';
import '../src/db.js';
import { db } from '../src/db.js';
import { paths } from '../src/fileStorage.js';

const sourceDir = process.argv[2] || 'C:\\Users\\DELL\\Downloads\\Propuestas VDH';

if (!fs.existsSync(sourceDir)) {
  console.error(`No existe la carpeta: ${sourceDir}`);
  process.exit(1);
}

// name, service_type, has_client_placeholder (1 = la portada tiene un cuadro de texto
// vacio seguro para completar, 0 = portada sin placeholder, se completa a mano).
const TEMPLATE_MAP = [
  { file: '2025.MM.DD - CLIENTE - VDH  Propuesta Coaching (Espanol).pptx', name: 'Coaching', service_type: 'coaching', language: 'es', has_client_placeholder: 1 },
  { file: '2025.MM.DD - CLIENTE - VDH Executive Search Propuesta.pptx', name: 'Executive Search', service_type: 'executive_search', language: 'es', has_client_placeholder: 0 },
  { file: '2025.MM.DD - CLIENTE - VDH Talent Acquisition Propuesta.pptx', name: 'Talent Acquisition', service_type: 'talent_acquisition', language: 'es', has_client_placeholder: 0 },
  { file: '2025.MM.DD - CLIENTE - VDH Talent Search Propuesta.pptx', name: 'Talent Search', service_type: 'talent_search', language: 'es', has_client_placeholder: 0 },
  { file: '2025.MM.DD - Cliente- VDH Market Insights Propuesta (Espanol).pptx', name: 'Market Insights', service_type: 'market_insights', language: 'es', has_client_placeholder: 1 },
  { file: '2025.MM.DD- Cliente - VDH Assessment Propuesta (Espanol).pptx', name: 'Assessment', service_type: 'assessment', language: 'es', has_client_placeholder: 0 },
  { file: '2026.MM.DD -  CLIENTE - VDH  Selfplacement Propuesta .pptx', name: 'Selfplacement', service_type: 'selfplacement', language: 'es', has_client_placeholder: 1 },
  { file: '2026.MM.DD Cliente - VDH Propuesta Future Quest_vs4  (1).pptx', name: 'Future Quest', service_type: 'future_quest', language: 'es', has_client_placeholder: 0 },
  { file: 'Presentacion Comercial Soluciones VON DER HEIDE.pptx', name: 'Presentacion Comercial VDH', service_type: 'institucional', language: 'es', has_client_placeholder: 0 },
];

const ENGLISH_DIR = 'TEMPLATES PROPUESTAS - Inglés';
const ENGLISH_TEMPLATE_MAP = [
  { match: 'Executive Search', name: 'Executive Search (EN)', service_type: 'executive_search' },
  { match: 'Talent Acquisition', name: 'Talent Acquisition (EN)', service_type: 'talent_acquisition' },
  { match: 'Talent Search', name: 'Talent Search (EN)', service_type: 'talent_search' },
  { match: 'Assessment', name: 'Assessment (EN)', service_type: 'assessment' },
  { match: 'Selfplacement', name: 'Selfplacement (EN)', service_type: 'selfplacement' },
];

const insertTemplate = db.prepare(
  `INSERT INTO templates (name, service_type, language, has_client_placeholder, file_path, category)
   VALUES (@name, @service_type, @language, @has_client_placeholder, @file_path, @category)`
);

let imported = 0;

function copyIntoTemplates(sourcePath, destName) {
  const destPath = path.join(paths.templatesDir, destName);
  fs.copyFileSync(sourcePath, destPath);
  return destPath;
}

for (const t of TEMPLATE_MAP) {
  const sourcePath = path.join(sourceDir, t.file);
  if (!fs.existsSync(sourcePath)) {
    console.warn(`Omitido (no encontrado): ${t.file}`);
    continue;
  }
  const destPath = copyIntoTemplates(sourcePath, `${t.name}.pptx`);
  insertTemplate.run({
    name: t.name,
    service_type: t.service_type,
    language: t.language,
    has_client_placeholder: t.has_client_placeholder,
    file_path: destPath,
    category: 'Español',
  });
  imported++;
  console.log(`Importada: ${t.name}`);
}

const englishDirPath = path.join(sourceDir, ENGLISH_DIR);
if (fs.existsSync(englishDirPath)) {
  const files = fs.readdirSync(englishDirPath).filter((f) => f.endsWith('.pptx'));
  for (const entry of ENGLISH_TEMPLATE_MAP) {
    const file = files.find((f) => f.includes(entry.match));
    if (!file) {
      console.warn(`Omitido (no encontrado en inglés): ${entry.match}`);
      continue;
    }
    const sourcePath = path.join(englishDirPath, file);
    const destPath = copyIntoTemplates(sourcePath, `${entry.name}.pptx`);
    insertTemplate.run({
      name: entry.name,
      service_type: entry.service_type,
      language: 'en',
      has_client_placeholder: 0,
      file_path: destPath,
      category: 'English',
    });
    imported++;
    console.log(`Importada: ${entry.name}`);
  }
} else {
  console.warn(`Omitida carpeta de plantillas en inglés (no encontrada): ${ENGLISH_DIR}`);
}

// Historial: la propuesta real ya enviada a Desol (Market Insights, 2026-05-29).
const desolFile = path.join(sourceDir, '2026.05.29 - Desol - VDH Market Insights Propuesta .pptx');
if (fs.existsSync(desolFile)) {
  const existingClient = db.prepare('SELECT * FROM clients WHERE name = ?').get('Desol');
  const clientId = existingClient
    ? existingClient.id
    : db.prepare('INSERT INTO clients (name) VALUES (?)').run('Desol').lastInsertRowid;

  const marketInsightsTemplate = db
    .prepare("SELECT * FROM templates WHERE service_type = 'market_insights' AND language = 'es'")
    .get();

  const destPath = path.join(paths.proposalsDir, `Desol - Market Insights.pptx`);
  fs.copyFileSync(desolFile, destPath);
  const sentAt = '2026-05-29 00:00:00';

  const result = db
    .prepare(
      `INSERT INTO proposals (client_id, template_id, title, service_type, file_path, status, sent_at)
       VALUES (?, ?, ?, 'market_insights', ?, 'enviada', ?)`
    )
    .run(clientId, marketInsightsTemplate?.id || null, 'Market Insights - Desol', destPath, sentAt);

  db.prepare('INSERT INTO proposal_status_history (proposal_id, status, changed_at) VALUES (?, ?, ?)').run(
    result.lastInsertRowid,
    'enviada',
    sentAt
  );

  console.log('Importada propuesta historica: Desol - Market Insights (enviada 2026-05-29)');
} else {
  console.warn('Omitida propuesta historica de Desol (archivo no encontrado)');
}

console.log(`\nListo. ${imported} plantillas importadas.`);
