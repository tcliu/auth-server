const SQL_KEYWORDS = new Set([
  'all',
  'analyse',
  'analyze',
  'and',
  'any',
  'array',
  'as',
  'asc',
  'asymmetric',
  'authorization',
  'binary',
  'both',
  'case',
  'cast',
  'check',
  'collate',
  'column',
  'concurrently',
  'constraint',
  'create',
  'cross',
  'current_catalog',
  'current_date',
  'current_role',
  'current_schema',
  'current_time',
  'current_timestamp',
  'current_user',
  'default',
  'deferrable',
  'desc',
  'distinct',
  'do',
  'else',
  'end',
  'except',
  'false',
  'fetch',
  'for',
  'foreign',
  'from',
  'full',
  'grant',
  'group',
  'having',
  'ilike',
  'in',
  'initially',
  'inner',
  'intersect',
  'into',
  'is',
  'isnull',
  'join',
  'lateral',
  'leading',
  'left',
  'like',
  'limit',
  'localtime',
  'localtimestamp',
  'natural',
  'not',
  'notnull',
  'null',
  'offset',
  'on',
  'only',
  'or',
  'order',
  'outer',
  'overlaps',
  'placing',
  'primary',
  'references',
  'returning',
  'right',
  'select',
  'session_user',
  'similar',
  'some',
  'symmetric',
  'table',
  'then',
  'to',
  'trailing',
  'true',
  'union',
  'unique',
  'user',
  'using',
  'variadic',
  'verbose',
  'when',
  'where',
  'window',
  'with'
]);

function toSnakeCase(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export function quoteIdentifier(identifier) {
  return SQL_KEYWORDS.has(identifier) ? `"${identifier}"` : identifier;
}

export function compileType(field, fieldName) {
  if (fieldName === 'id') return 'uuid default pg_catalog.gen_random_uuid()';
  if (field.references?.field === 'id') return 'uuid';

  switch (field.type) {
    case 'string':
      return 'text';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'timestamptz';
    case 'json':
    case 'string[]':
    case 'number[]':
      return 'jsonb';
    case 'number':
      return 'integer';
    default:
      throw new Error(`Unsupported field type: ${String(field.type)}`);
  }
}

export function compileDefault(field) {
  if (field.type === 'date' && typeof field.defaultValue === 'function') {
    return ' default current_timestamp';
  }

  if (typeof field.defaultValue === 'boolean') {
    return ` default ${field.defaultValue}`;
  }

  if (typeof field.defaultValue === 'number') {
    return ` default ${field.defaultValue}`;
  }

  if (typeof field.defaultValue === 'string') {
    return ` default '${field.defaultValue.replaceAll("'", "''")}'`;
  }

  return '';
}

export function compileColumn(tableName, fieldName, field) {
  const parts = [quoteIdentifier(fieldName), compileType(field, fieldName)];

  if (field.defaultValue !== undefined) {
    parts.push(compileDefault(field).trim());
  }

  if (field.required !== false) {
    parts.push('not null');
  }

  if (field.unique) {
    parts.push('unique');
  }

  if (fieldName === 'id') {
    parts.push('primary key');
  }

  if (field.references) {
    const referenceField = field.references.field === 'id'
      ? 'id'
      : toSnakeCase(field.references.field);
    parts.push(
      `references ${quoteIdentifier(field.references.model)} (${quoteIdentifier(referenceField)}) on delete ${field.references.onDelete || 'cascade'}`
    );
  }

  return `  ${parts.join(' ')}`;
}

export function compileIndex(tableName, fieldName, field) {
  if (!field.index) return null;

  const indexName = `${tableName}_${fieldName}_${field.unique ? 'uidx' : 'idx'}`;

  return `create index ${quoteIdentifier(indexName)}\n  on ${quoteIdentifier(tableName)} (${quoteIdentifier(fieldName)});`;
}

export function compileTable(tableName, table) {
  const fields = Object.entries(table.fields);
  const columns = [
    `  ${quoteIdentifier('id')} uuid default pg_catalog.gen_random_uuid() not null primary key`,
    ...fields.map(([fieldName, field]) => compileColumn(tableName, fieldName, field))
  ];

  const indexes = fields
    .map(([fieldName, field]) => compileIndex(tableName, fieldName, field))
    .filter(Boolean);

  const statements = [
    `create table ${quoteIdentifier(tableName)} (`,
    columns.join(',\n'),
    ');'
  ];

  if (indexes.length > 0) {
    statements.push(...indexes);
  }

  return statements.join('\n\n');
}

export function buildSchemaSql(schema, dbSchema = 'auth') {
  const orderedTables = Object.entries(schema)
    .sort(([, left], [, right]) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER))
    .map(([tableName, table]) => compileTable(tableName, table));

  return [
    `create schema if not exists ${quoteIdentifier(dbSchema)};`,
    '',
    `set search_path to ${quoteIdentifier(dbSchema)};`,
    '',
    orderedTables.join('\n\n')
  ].join('\n')
    .replaceAll('(\n\n  ', '(\n  ')
    .replaceAll('\n\n);', '\n);');
}
