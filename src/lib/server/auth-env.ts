import { env } from '$env/dynamic/private';

function trim(value: string | null | undefined) {
  return value?.trim() || '';
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getAuthEnv() {
  const baseURL = trim(env.BETTER_AUTH_URL);
  const secret = trim(env.BETTER_AUTH_SECRET || env.AUTH_SECRET);
  const trustedOrigins = splitCsv(trim(env.AUTH_TRUSTED_ORIGINS));
  const databaseURL = trim(env.DATABASE_URL);
  const jwtAudience = trim(env.JWT_AUDIENCE) || baseURL;
  const mailFrom = trim(env.MAIL_FROM);
  const mailProviderApiKey = trim(env.MAIL_PROVIDER_API_KEY);

  return {
    appName: trim(env.AUTH_APP_NAME) || 'Auth Server',
    baseURL,
    secret,
    trustedOrigins,
    databaseURL,
    jwtAudience,
    mailFrom,
    mailProviderApiKey,
    githubClientId: trim(env.GITHUB_CLIENT_ID),
    githubClientSecret: trim(env.GITHUB_CLIENT_SECRET)
  };
}

export function getAuthEnvStatus() {
  const authEnv = getAuthEnv();

  return {
    baseURLConfigured: !!authEnv.baseURL,
    secretConfigured: !!authEnv.secret,
    databaseConfigured: !!authEnv.databaseURL,
    jwtAudienceConfigured: !!authEnv.jwtAudience,
    mailConfigured: !!authEnv.mailFrom && !!authEnv.mailProviderApiKey,
    trustedOriginsConfigured: authEnv.trustedOrigins.length > 0
  };
}

export function assertRequiredAuthEnv() {
  const authEnv = getAuthEnv();
  const missing = [
    !authEnv.baseURL ? 'BETTER_AUTH_URL' : null,
    !authEnv.secret ? 'BETTER_AUTH_SECRET' : null,
    !authEnv.databaseURL ? 'DATABASE_URL' : null
  ].filter((value): value is string => !!value);

  if (missing.length > 0) {
    throw new Error(`Missing required auth env: ${missing.join(', ')}`);
  }

  return authEnv;
}
