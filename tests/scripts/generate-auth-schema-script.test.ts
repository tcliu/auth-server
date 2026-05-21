import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  writeFile: vi.fn(),
  getSchema: vi.fn(),
  createAuthConfig: vi.fn(),
  buildSchemaSql: vi.fn(),
  databaseEnd: vi.fn(),
  info: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  writeFile: mocks.writeFile
}));

vi.mock('../../node_modules/better-auth/dist/db/get-schema.mjs', () => ({
  getSchema: mocks.getSchema
}));

vi.mock('../../scripts/auth-config.mjs', () => ({
  createAuthConfig: mocks.createAuthConfig
}));

vi.mock('../../scripts/auth-schema-compiler.mjs', () => ({
  buildSchemaSql: mocks.buildSchemaSql
}));

describe('generate-auth-schema script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('console', {
      ...console,
      log: mocks.info
    });
  });

  it('builds and writes schema.sql from the generated auth schema', async () => {
    const config = {
      database: {
        end: mocks.databaseEnd
      }
    };
    const schema = { user: { order: 1, fields: {} } };

    mocks.createAuthConfig.mockReturnValue(config);
    mocks.getSchema.mockReturnValue(schema);
    mocks.buildSchemaSql.mockReturnValue('create table "user" ();');

    await import('../../scripts/generate-auth-schema.mjs');

    expect(mocks.createAuthConfig).toHaveBeenCalledWith({
      DATABASE_URL: 'postgres://placeholder'
    });
    expect(mocks.getSchema).toHaveBeenCalledWith(config);
    expect(mocks.databaseEnd).toHaveBeenCalledOnce();
    expect(mocks.buildSchemaSql).toHaveBeenCalledWith(schema, 'auth');
    expect(mocks.writeFile).toHaveBeenCalledWith(
      expect.any(URL),
      'create table "user" ();\n',
      'utf8'
    );
    expect(mocks.info).toHaveBeenCalledWith('Wrote schema.sql');
  });
});
