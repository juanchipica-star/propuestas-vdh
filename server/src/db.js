import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const isRemote = Boolean(process.env.TURSO_DATABASE_URL);

let client;
if (isRemote) {
  // Turso (libSQL en la nube): persiste de verdad entre invocaciones serverless.
  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  // Local/Render: archivo SQLite en disco, resuelto relativo a server/ (no al cwd del proceso).
  const dbFilePath = process.env.VERCEL
    ? '/tmp/propuestas.db'
    : process.env.DB_PATH
      ? path.resolve(process.env.DB_PATH)
      : path.join(serverRoot, 'data', 'propuestas.db');
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
  client = createClient({ url: `file:${dbFilePath}` });
}

function rowToObject(row, columns) {
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj;
}

// args llega como en node:sqlite: multiples valores posicionales (.run(a, b, c)) o un
// unico objeto con parametros nombrados (.all({status, client_id})).
function toLibsqlArgs(callArgs) {
  if (callArgs.length === 1 && callArgs[0] !== null && typeof callArgs[0] === 'object' && !Array.isArray(callArgs[0])) {
    return callArgs[0];
  }
  return callArgs;
}

// Envoltorio con la misma forma que usaban las rutas con node:sqlite (prepare().run/get/all),
// pero async ya que libSQL siempre habla por red (incluso en modo archivo local).
export const db = {
  prepare(sql) {
    return {
      async run(...callArgs) {
        const result = await client.execute({ sql, args: toLibsqlArgs(callArgs) });
        return {
          lastInsertRowid: result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
          changes: result.rowsAffected,
        };
      },
      async get(...callArgs) {
        const result = await client.execute({ sql, args: toLibsqlArgs(callArgs) });
        return result.rows[0] ? rowToObject(result.rows[0], result.columns) : undefined;
      },
      async all(...callArgs) {
        const result = await client.execute({ sql, args: toLibsqlArgs(callArgs) });
        return result.rows.map((row) => rowToObject(row, result.columns));
      },
    };
  },
  // Nota: no es una transaccion real (BEGIN/COMMIT) - alcanza para el unico uso actual
  // (upsert masivo de plantillas sincronizadas desde Drive, camino que hoy no esta activo).
  transaction(fn) {
    return async (...args) => fn(...args);
  },
};

if (!isRemote) {
  await client.execute('PRAGMA journal_mode = WAL');
}
await client.execute('PRAGMA foreign_keys = ON');

const schemaPath = path.join(serverRoot, 'src', 'schema.sql');
await client.executeMultiple(fs.readFileSync(schemaPath, 'utf8'));
