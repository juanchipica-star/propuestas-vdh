// Ejecutar con: npm run get-refresh-token
// Abre un flujo OAuth2 por consola para obtener un GOOGLE_REFRESH_TOKEN de un solo uso.
// Requiere GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI ya en server/.env
import 'dotenv/config';
import { google } from 'googleapis';
import http from 'node:http';
import { URL } from 'node:url';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.error('Falta GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI en server/.env');
  process.exit(1);
}

const redirectUrl = new URL(GOOGLE_REDIRECT_URI);
const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive'],
});

console.log('\nAbre esta URL en tu navegador, inicia sesion con la cuenta de Google de la empresa y autoriza el acceso:\n');
console.log(authUrl + '\n');

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${redirectUrl.hostname}:${redirectUrl.port}`);
  if (requestUrl.pathname !== redirectUrl.pathname) {
    res.writeHead(404);
    res.end();
    return;
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('Falta el parametro "code" en la respuesta de Google.');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Listo</h1><p>Ya puedes cerrar esta pestana y volver a la terminal.</p>');
    console.log('\nGOOGLE_REFRESH_TOKEN obtenido. Copialo en server/.env:\n');
    console.log(tokens.refresh_token || '(no se recibio refresh_token; revoca el acceso previo de la app en https://myaccount.google.com/permissions y vuelve a intentar)');
    console.log('');
    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500);
    res.end('Error obteniendo el token, revisa la terminal.');
    console.error(err);
    server.close();
    process.exit(1);
  }
});

server.listen(Number(redirectUrl.port) || 4000, () => {
  console.log(`Esperando la respuesta de Google en ${GOOGLE_REDIRECT_URI} ...`);
});
