import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Resuelta relativa a server/, no al directorio de trabajo del proceso: en el host de
// produccion el proceso puede arrancar con el cwd en la raiz del repo. En Vercel el
// filesystem del deploy es de solo lectura salvo /tmp (efimero por invocacion).
const resolvedPath = process.env.VERCEL
  ? '/tmp/propuestas.db'
  : process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(serverRoot, 'data', 'propuestas.db');
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const sqlite = new DatabaseSync(resolvedPath);
sqlite.exec('PRAGMA journal_mode = WAL');
sqlite.exec('PRAGMA foreign_keys = ON');

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');
sqlite.exec(fs.readFileSync(schemaPath, 'utf8'));

// Envoltorio con la misma forma que usan las rutas (prepare().run/get/all + transaction).
export const db = {
  prepare(sql) {
    const stmt = sqlite.prepare(sql);
    return {
      run: (...args) => stmt.run(...args),
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args),
    };
  },
  transaction(fn) {
    return (...args) => {
      sqlite.exec('BEGIN');
      try {
        const result = fn(...args);
        sqlite.exec('COMMIT');
        return result;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    };
  },
};
