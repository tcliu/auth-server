import { Pool } from 'pg';
import { assertRequiredAuthEnv } from './auth-env';

let pool: Pool | null = null;

export function getDbPool() {
  if (pool) return pool;

  const authEnv = assertRequiredAuthEnv();
  pool = new Pool({
    connectionString: authEnv.databaseURL,
    options: '-c search_path=auth',
    max: 10
  });
  return pool;
}
