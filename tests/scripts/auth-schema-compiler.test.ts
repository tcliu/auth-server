import { describe, expect, it } from 'vitest';
import {
  buildSchemaSql,
  compileColumn,
  compileIndex,
  quoteIdentifier
} from '../../scripts/auth-schema-compiler.mjs';

describe('auth schema compiler', () => {
  it('quotes only keyword identifiers', () => {
    expect(quoteIdentifier('user')).toBe('"user"');
    expect(quoteIdentifier('account')).toBe('account');
    expect(quoteIdentifier('user_id')).toBe('user_id');
  });

  it('keeps non-keyword identifiers unquoted while quoting keyword references', () => {
    expect(
      compileColumn('session', 'user_id', {
        type: 'string',
        references: {
          model: 'user',
          field: 'id',
          onDelete: 'cascade'
        }
      })
    ).toBe('  user_id uuid not null references "user" (id) on delete cascade');
  });

  it('emits unquoted indexes for non-keyword identifiers', () => {
    expect(
      compileIndex('session', 'user_id', { index: true, unique: false })
    ).toBe('create index session_user_id_idx\n  on session (user_id);');
  });

  it('builds schema SQL with selective quoting', () => {
    const sql = buildSchemaSql({
      user: {
        order: 1,
        fields: {
          email: {
            type: 'string',
            unique: true
          }
        }
      },
      session: {
        order: 2,
        fields: {
          user_id: {
            type: 'string',
            index: true,
            references: {
              model: 'user',
              field: 'id',
              onDelete: 'cascade'
            }
          }
        }
      }
    });

    expect(sql).toContain('create table "user" (');
    expect(sql).toContain('create table session (');
    expect(sql).toContain('  email text not null unique');
    expect(sql).toContain('  user_id uuid not null references "user" (id) on delete cascade');
    expect(sql).toContain('create index session_user_id_idx\n  on session (user_id);');
    expect(sql).not.toContain('"session"');
    expect(sql).not.toContain('"email"');
    expect(sql).not.toContain('"user_id"');
  });
});
