import { google } from 'googleapis';

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_REFRESH_TOKEN } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return null;
  }

  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return client;
}

function getDriveClient() {
  const auth = getOAuthClient();
  if (!auth) {
    throw new Error(
      'Google Drive no esta configurado. Completa GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN en server/.env (ver README).'
    );
  }
  return google.drive({ version: 'v3', auth });
}

export function isDriveConfigured() {
  return getOAuthClient() !== null;
}

export async function listFilesInFolder(folderId) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, webViewLink, mimeType, modifiedTime)',
    orderBy: 'name',
  });
  return res.data.files || [];
}

export async function copyFile(fileId, newName, destFolderId) {
  const drive = getDriveClient();
  const res = await drive.files.copy({
    fileId,
    requestBody: {
      name: newName,
      parents: destFolderId ? [destFolderId] : undefined,
    },
    fields: 'id, webViewLink',
  });
  return { id: res.data.id, webViewLink: res.data.webViewLink };
}

export async function getShareableLink(fileId) {
  const drive = getDriveClient();
  const res = await drive.files.get({ fileId, fields: 'webViewLink' });
  return res.data.webViewLink;
}
