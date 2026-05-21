# Project Rules

- If a `*.vercel.app` alias returns `401 Authentication Required`, check Vercel project `ssoProtection` first.
- `ssoProtection.deploymentType = "all_except_custom_domains"` can still block `*.vercel.app` aliases.
- To make the alias public, disable Vercel Authentication for the project by setting `ssoProtection: null`.
- For generated SQL DDL, use multi-line `create table` statements.
- For generated SQL DDL, keep related `create index` statements adjacent to the table they belong to, and inline constraints in the table DDL when the database supports it.
- For generated SQL artifacts, use `sql/` as the output directory.
- For generated SQL schemas, use snake_case table and column names so runtime mappings and DDL stay consistent.
- For generated PostgreSQL indexes, use lower-case standalone `create index` statements; do not try to create normal indexes with `alter table`.
- For generated SQL, use lower-case SQL keywords.
