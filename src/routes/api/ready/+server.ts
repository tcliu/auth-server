import { json } from '@sveltejs/kit';
import { getAuthEnvStatus } from '$lib/server/auth-env';
import { getDbPool } from '$lib/server/db';
import { isAuthConfigured } from '$lib/server/auth';

export const GET = async () => {
  const envStatus = getAuthEnvStatus();

  if (!isAuthConfigured()) {
    return json({
      ok: false,
      env: envStatus,
      databaseReachable: false,
      error: 'Auth server is not fully configured yet'
    }, { status: 503 });
  }

  try {
    const pool = getDbPool();
    await pool.query('select 1 as ok');
    return json({ ok: true, env: envStatus, databaseReachable: true });
  } catch (error) {
    return json({
      ok: false,
      env: envStatus,
      databaseReachable: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 503 });
  }
};
