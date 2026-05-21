import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedPrivateEnv = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>
}));

vi.mock('$env/dynamic/private', () => ({
  env: mockedPrivateEnv.env
}));

import { assertRequiredAuthEnv, getAuthEnv, getAuthEnvStatus } from './auth-env';

describe('auth env helpers', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockedPrivateEnv.env)) {
      delete mockedPrivateEnv.env[key];
    }
  });

  it('parses configured auth environment values', () => {
    Object.assign(mockedPrivateEnv.env, {
      AUTH_APP_NAME: '  Portfolio Auth  ',
      APP_BASE_URL: ' https://auth.example.com ',
      AUTH_SECRET: ' fallback-secret ',
      AUTH_TRUSTED_ORIGINS: ' https://app.example.com, https://admin.example.com ',
      DATABASE_URL: ' postgres://db ',
      JWT_AUDIENCE: ' portfolio-api ',
      MAIL_FROM: ' noreply@example.com ',
      SMTP_HOST: ' smtp.example.com ',
      SMTP_PORT: ' 587 ',
      SMTP_SECURE: 'true',
      SMTP_USER: ' smtp-user ',
      SMTP_PASS: ' smtp-pass ',
      GITHUB_CLIENT_ID: ' github-client ',
      GITHUB_CLIENT_SECRET: ' github-secret ',
      OAUTH_PM_CLIENT_ID: ' custom-client ',
      OAUTH_PM_CLIENT_SECRET: ' custom-secret ',
      OAUTH_PM_REDIRECT_URIS: ' myapp://callback, https://app.example.com/callback ',
      OAUTH_PM_POST_LOGOUT_REDIRECT_URIS: ' myapp://logout ',
      OAUTH_PM_AUDIENCE: ' portfolio-manager-api ',
      OAUTH_ALLOW_DYNAMIC_CLIENT_REGISTRATION: 'true'
    });

    expect(getAuthEnv()).toEqual({
      appName: 'Portfolio Auth',
      baseURL: 'https://auth.example.com',
      secret: 'fallback-secret',
      trustedOrigins: ['https://app.example.com', 'https://admin.example.com'],
      databaseURL: 'postgres://db',
      jwtAudience: 'portfolio-api',
      mailFrom: 'noreply@example.com',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: true,
      smtpUser: 'smtp-user',
      smtpPass: 'smtp-pass',
      githubClientId: 'github-client',
      githubClientSecret: 'github-secret',
      oauthClientId: 'custom-client',
      oauthClientSecret: 'custom-secret',
      oauthRedirectUris: ['myapp://callback', 'https://app.example.com/callback'],
      oauthPostLogoutRedirectUris: ['myapp://logout'],
      oauthAudience: 'portfolio-manager-api',
      oauthAllowDynamicClientRegistration: true
    });
  });

  it('reports configuration status using defaults where applicable', () => {
    Object.assign(mockedPrivateEnv.env, {
      APP_BASE_URL: 'https://auth.example.com',
      BETTER_AUTH_SECRET: 'primary-secret',
      DATABASE_URL: 'postgres://db',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '2525',
      SMTP_USER: 'mailer',
      SMTP_PASS: 'secret',
      MAIL_FROM: 'noreply@example.com',
      AUTH_TRUSTED_ORIGINS: 'https://app.example.com'
    });

    expect(getAuthEnvStatus()).toEqual({
      baseURLConfigured: true,
      secretConfigured: true,
      databaseConfigured: true,
      jwtAudienceConfigured: true,
      mailConfigured: true,
      trustedOriginsConfigured: true
    });
  });

  it('throws when required auth environment values are missing', () => {
    Object.assign(mockedPrivateEnv.env, {
      APP_BASE_URL: 'https://auth.example.com'
    });

    expect(() => assertRequiredAuthEnv()).toThrow(
      'Missing required auth env: BETTER_AUTH_SECRET, DATABASE_URL'
    );
  });
});
