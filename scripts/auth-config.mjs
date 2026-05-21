import { existsSync, readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { username, jwt } from 'better-auth/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';

const DB_SCHEMA = 'auth';

function splitCsv(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toSnakeCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function createFieldMap(fields) {
  return Object.fromEntries(fields.map((field) => [field, toSnakeCase(field)]));
}

const coreFieldMaps = {
  user: createFieldMap(['name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt', 'displayUsername']),
  session: createFieldMap(['expiresAt', 'token', 'createdAt', 'updatedAt', 'ipAddress', 'userAgent', 'userId']),
  account: createFieldMap([
    'accountId',
    'providerId',
    'userId',
    'accessToken',
    'refreshToken',
    'idToken',
    'accessTokenExpiresAt',
    'refreshTokenExpiresAt',
    'scope',
    'password',
    'createdAt',
    'updatedAt'
  ]),
  verification: createFieldMap(['identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt'])
};

const oauthSchema = {
  oauthClient: {
    modelName: 'oauth_client',
    fields: createFieldMap([
      'clientId',
      'clientSecret',
      'disabled',
      'skipConsent',
      'enableEndSession',
      'subjectType',
      'scopes',
      'userId',
      'createdAt',
      'updatedAt',
      'name',
      'uri',
      'icon',
      'contacts',
      'tos',
      'policy',
      'softwareId',
      'softwareVersion',
      'softwareStatement',
      'redirectUris',
      'postLogoutRedirectUris',
      'tokenEndpointAuthMethod',
      'grantTypes',
      'responseTypes',
      'public',
      'type',
      'requirePKCE',
      'referenceId',
      'metadata'
    ])
  },
  oauthRefreshToken: {
    modelName: 'oauth_refresh_token',
    fields: createFieldMap(['token', 'clientId', 'sessionId', 'userId', 'referenceId', 'expiresAt', 'createdAt', 'revoked', 'authTime', 'scopes'])
  },
  oauthAccessToken: {
    modelName: 'oauth_access_token',
    fields: createFieldMap(['token', 'clientId', 'sessionId', 'userId', 'referenceId', 'refreshId', 'expiresAt', 'createdAt', 'scopes'])
  },
  oauthConsent: {
    modelName: 'oauth_consent',
    fields: createFieldMap(['clientId', 'userId', 'referenceId', 'scopes', 'createdAt', 'updatedAt'])
  }
};

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadScriptEnv(env) {
  return {
    ...parseEnvFile('.env'),
    ...parseEnvFile('.env.local'),
    ...parseEnvFile('.env.vercel'),
    ...env
  };
}

export function createAuthConfig(env = process.env) {
  const loadedEnv = loadScriptEnv(env);
  const baseURL = (loadedEnv.BETTER_AUTH_URL || '').trim() || 'http://localhost:3001';
  const oauthAudience = (loadedEnv.OAUTH_PM_AUDIENCE || '').trim() || 'https://codepg-portfolio-manager.vercel.app';
  const oauthClientId = (loadedEnv.OAUTH_PM_CLIENT_ID || '').trim() || 'portfolio-manager';
  const oauthClientSecret = (loadedEnv.OAUTH_PM_CLIENT_SECRET || '').trim();
  const oauthRedirectUris = splitCsv((loadedEnv.OAUTH_PM_REDIRECT_URIS || '').trim());
  const oauthPostLogoutRedirectUris = splitCsv((loadedEnv.OAUTH_PM_POST_LOGOUT_REDIRECT_URIS || '').trim());
  const oauthAllowDynamicClientRegistration = (loadedEnv.OAUTH_ALLOW_DYNAMIC_CLIENT_REGISTRATION || '').trim() === 'true';
  const databaseURL = (loadedEnv.DATABASE_URL || '').trim();

  if (!databaseURL) {
    throw new Error('Missing DATABASE_URL for auth schema generation/migration');
  }

  const database = new Pool({
    connectionString: databaseURL,
    max: 1
  });

  return {
    appName: (loadedEnv.AUTH_APP_NAME || '').trim() || 'Auth Server',
    baseURL,
    basePath: '/api/auth',
    secret: (loadedEnv.BETTER_AUTH_SECRET || loadedEnv.AUTH_SECRET || '').trim() || 'development-fallback-secret-12345678901234567890',
    database,
    user: {
      fields: coreFieldMaps.user
    },
    session: {
      fields: coreFieldMaps.session
    },
    account: {
      fields: coreFieldMaps.account
    },
    verification: {
      fields: coreFieldMaps.verification
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false
    },
    plugins: [
      username({
        schema: {
          user: {
            fields: {
              username: 'username',
              displayUsername: 'display_username'
            }
          }
        }
      }),
      jwt({
        disableSettingJwtHeader: true,
        schema: {
          jwks: {
            modelName: 'jwks',
            fields: createFieldMap(['publicKey', 'privateKey', 'createdAt', 'expiresAt'])
          }
        },
        jwt: {
          issuer: baseURL,
          audience: oauthAudience,
          expirationTime: '15m'
        }
      }),
      oauthProvider({
        schema: oauthSchema,
        loginPage: '/auth/sign-in',
        consentPage: '/auth/consent',
        allowDynamicClientRegistration: oauthAllowDynamicClientRegistration,
        validAudiences: [oauthAudience],
        scopes: ['openid', 'profile', 'email', 'offline_access', 'read:portfolio', 'write:portfolio'],
        trustedClients: oauthRedirectUris.length > 0
          ? [
              {
                clientId: oauthClientId,
                clientSecret: oauthClientSecret || undefined,
                name: 'Portfolio Manager',
                type: oauthClientSecret ? 'web' : 'native',
                redirectUris: oauthRedirectUris,
                postLogoutRedirectUris: oauthPostLogoutRedirectUris,
                tokenEndpointAuthMethod: oauthClientSecret ? 'client_secret_post' : 'none',
                grantTypes: ['authorization_code', 'refresh_token'],
                responseTypes: ['code'],
                skipConsent: true,
                metadata: JSON.stringify({ application: 'portfolio-manager' })
              }
            ]
          : []
      })
    ],
    advanced: {
      database: {
        generateId: 'uuid'
      }
    }
  };
}

export async function ensureAuthSchema(pool) {
  await pool.query(`create schema if not exists ${DB_SCHEMA}`);
  await pool.query(`set search_path to ${DB_SCHEMA}`);
}
