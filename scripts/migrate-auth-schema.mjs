import { getMigrations } from '../node_modules/better-auth/dist/db/get-migration.mjs';
import { createAuthConfig, ensureAuthSchema } from './auth-config.mjs';

const config = createAuthConfig();
await ensureAuthSchema(config.database);
const { runMigrations } = await getMigrations(config);

await runMigrations();
await config.database.end();
console.log('Applied auth schema migrations');
