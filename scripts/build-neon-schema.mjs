import { readFile } from 'node:fs/promises';
import { createAuthConfig } from './auth-config.mjs';

const config = createAuthConfig();
const sql = await readFile(new URL('../sql/schema.sql', import.meta.url), 'utf8');

await config.database.query(sql);
await config.database.end();

console.log('Applied sql/schema.sql to Neon DB');
