import { writeFile } from 'node:fs/promises';
import { getSchema } from '../node_modules/better-auth/dist/db/get-schema.mjs';
import { createAuthConfig } from './auth-config.mjs';
import { buildSchemaSql } from './auth-schema-compiler.mjs';

const DB_SCHEMA = 'auth';

const config = createAuthConfig({ DATABASE_URL: 'postgres://placeholder' });
const schema = getSchema(config);
await config.database.end();

const sql = buildSchemaSql(schema, DB_SCHEMA);

await writeFile(new URL('../sql/schema.sql', import.meta.url), `${sql}\n`, 'utf8');
console.log('Wrote schema.sql');
