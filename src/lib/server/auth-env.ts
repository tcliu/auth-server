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
  const baseURL = trim(env.APP_BASE_URL);
  const secret = trim(env.BETTER_AUTH_SECRET || env.AUTH_SECRET);
  const trustedOrigins = splitCsv(trim(env.AUTH_TRUSTED_ORIGINS));
  const databaseURL = trim(env.DATABASE_URL);
  const jwtAudience = trim(env.JWT_AUDIENCE) || baseURL;
  const mailFrom = trim(env.MAIL_FROM);
  const smtpHost = trim(env.SMTP_HOST);
  const smtpPortValue = trim(env.SMTP_PORT);
  const smtpPort = smtpPortValue ? Number(smtpPortValue) : undefined;
  const smtpSecure = trim(env.SMTP_SECURE) === 'true';
  const smtpUser = trim(env.SMTP_USER);
  const smtpPass = trim(env.SMTP_PASS);

  return {
    appName: trim(env.AUTH_APP_NAME) || 'Auth Server',
    baseURL,
    secret,
    trustedOrigins,
    databaseURL,
    jwtAudience,
    mailFrom,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    githubClientId: trim(env.GITHUB_CLIENT_ID),
    githubClientSecret: trim(env.GITHUB_CLIENT_SECRET),
    oauthClientId: trim(env.OAUTH_PM_CLIENT_ID) || 'portfolio-manager',
    oauthClientSecret: trim(env.OAUTH_PM_CLIENT_SECRET),
    oauthRedirectUris: splitCsv(trim(env.OAUTH_PM_REDIRECT_URIS)),
    oauthPostLogoutRedirectUris: splitCsv(trim(env.OAUTH_PM_POST_LOGOUT_REDIRECT_URIS)),
    oauthAudience: trim(env.OAUTH_PM_AUDIENCE) || 'https://codepg-portfolio-manager.vercel.app',
    oauthAllowDynamicClientRegistration: trim(env.OAUTH_ALLOW_DYNAMIC_CLIENT_REGISTRATION) === 'true'
  };
}

export function getAuthEnvStatus() {
  const authEnv = getAuthEnv();

  return {
    baseURLConfigured: !!authEnv.baseURL,
    secretConfigured: !!authEnv.secret,
    databaseConfigured: !!authEnv.databaseURL,
    jwtAudienceConfigured: !!authEnv.jwtAudience,
    mailConfigured: !!authEnv.mailFrom && !!authEnv.smtpHost && !!authEnv.smtpPort && !!authEnv.smtpUser && !!authEnv.smtpPass,
    trustedOriginsConfigured: authEnv.trustedOrigins.length > 0
  };
}

export function assertRequiredAuthEnv() {
  const authEnv = getAuthEnv();
  const missing = [
    !authEnv.baseURL ? 'APP_BASE_URL' : null,
    !authEnv.secret ? 'BETTER_AUTH_SECRET' : null,
    !authEnv.databaseURL ? 'DATABASE_URL' : null
  ].filter((value): value is string => !!value);

  if (missing.length > 0) {
    throw new Error(`Missing required auth env: ${missing.join(', ')}`);
  }

  return authEnv;
}
