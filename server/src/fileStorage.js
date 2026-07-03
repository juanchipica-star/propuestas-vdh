import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDriveConfigured, copyFile as driveCopyFile } from './googleDrive.js';
import { fillClientNameIfPossible } from './pptx.js';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Las plantillas son contenido de la app: viven versionadas en git (solo lectura en
// runtime) para que el deploy las tenga disponibles sin depender de una carpeta local del
// usuario. Las propuestas generadas por cliente son datos de runtime: no se versionan, y en
// Vercel el filesystem del deploy es de solo lectura salvo /tmp (efimero).
const templatesDir = path.join(serverRoot, 'assets', 'templates');
const proposalsDir = process.env.VERCEL
  ? '/tmp/proposals'
  : path.join(serverRoot, 'data', 'files', 'proposals');
fs.mkdirSync(templatesDir, { recursive: true });
fs.mkdirSync(proposalsDir, { recursive: true });

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').trim();
}

export function saveTemplateFileLocally(buffer, filename) {
  const safeName = sanitizeFilename(filename);
  const destPath = path.join(templatesDir, safeName);
  fs.writeFileSync(destPath, buffer);
  return { file_path: destPath, url: `/api/files/templates/${encodeURIComponent(safeName)}` };
}

// Genera el archivo de una propuesta nueva a partir de una plantilla: en Drive si esta
// configurado, o localmente (copiando el archivo y completando el nombre del cliente
// cuando el placeholder de portada lo permite).
export async function generateProposalFile(template, { clientName, title }) {
  const filename = `${title}.pptx`;

  if (isDriveConfigured() && template.drive_file_id) {
    const copy = await driveCopyFile(template.drive_file_id, title, process.env.DRIVE_PROPOSALS_FOLDER_ID);
    return { drive_file_id: copy.id, drive_link: copy.webViewLink, file_path: null, filledClientName: false };
  }

  if (!template.file_path || !fs.existsSync(template.file_path)) {
    throw new Error('La plantilla no tiene un archivo local ni esta en Google Drive.');
  }

  const originalBuffer = fs.readFileSync(template.file_path);
  const { buffer, filled } = template.has_client_placeholder
    ? await fillClientNameIfPossible(originalBuffer, clientName)
    : { buffer: originalBuffer, filled: false };

  const safeName = sanitizeFilename(`${filename}`);
  const destPath = path.join(proposalsDir, `${Date.now()}-${safeName}`);
  fs.writeFileSync(destPath, buffer);

  return {
    drive_file_id: null,
    drive_link: null,
    file_path: destPath,
    filledClientName: filled,
  };
}

export function fileUrlFor(filePath) {
  if (!filePath) return null;
  const filename = path.basename(filePath);
  const kind = filePath.includes(proposalsDir) ? 'proposals' : 'templates';
  return `/api/files/${kind}/${encodeURIComponent(filename)}`;
}

export const paths = { templatesDir, proposalsDir };
