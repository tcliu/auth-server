create schema if not exists auth;

set search_path to auth;

create table "user" (
  id uuid default pg_catalog.gen_random_uuid() not null primary key,
  name text not null,
  email text not null unique,
  email_verified boolean default false not null,
  image text,
  created_at timestamptz default current_timestamp not null,
  updated_at timestamptz default current_timestamp not null,
  username text unique,
  display_username text
);

create table session (
  id uuid default pg_catalog.gen_random_uuid() not null primary key,
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz default current_timestamp not null,
  updated_at timestamptz not null,
  ip_address text,
  user_agent text,
  user_id uuid not null references "user" (id) on delete cascade
);

create index session_user_id_idx
  on session (user_id);

create table account (
  id uuid default pg_catalog.gen_random_uuid() not null primary key,
  account_id text not null,
  provider_id text not null,
  user_id uuid not null references "user" (id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz default current_timestamp not null,
  updated_at timestamptz not null
);

create index account_user_id_idx
  on account (user_id);

create table verification (
  id uuid default pg_catalog.gen_random_uuid() not null primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz default current_timestamp not null,
  updated_at timestamptz default current_timestamp not null
);

create index verification_identifier_idx
  on verification (identifier);

create table jwks (
  id uuid default pg_catalog.gen_random_uuid() not null primary key,
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null,
  expires_at timestamptz
);

create table oauth_client (
  id uuid default pg_catalog.gen_random_uuid() not null primary key,
  client_id text not null unique,
  client_secret text,
  disabled boolean default false,
  skip_consent boolean,
  enable_end_session boolean,
  subject_type text,
  scopes jsonb,
  user_id uuid references "user" (id) on delete cascade,
  created_at timestamptz,
  updated_at timestamptz,
  name text,
  uri text,
  icon text,
  contacts jsonb,
  tos text,
  policy text,
  software_id text,
  software_version text,
  software_statement text,
  redirect_uris jsonb not null,
  post_logout_redirect_uris jsonb,
  token_endpoint_auth_method text,
  grant_types jsonb,
  response_types jsonb,
  public boolean,
  type text,
  require_pkce boolean,
  reference_id text,
  metadata jsonb
);

create index oauth_client_user_id_idx
  on oauth_client (user_id);

create table oauth_refresh_token (
  id uuid default pg_catalog.gen_random_uuid() not null primary key,
  token text not null unique,
  client_id text not null references oauth_client (client_id) on delete cascade,
  session_id uuid references session (id) on delete set null,
  user_id uuid not null references "user" (id) on delete cascade,
  reference_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null,
  revoked timestamptz,
  auth_time timestamptz,
  scopes jsonb not null
);

create index oauth_refresh_token_client_id_idx
  on oauth_refresh_token (client_id);

create index oauth_refresh_token_session_id_idx
  on oauth_refresh_token (session_id);

create index oauth_refresh_token_user_id_idx
  on oauth_refresh_token (user_id);

create table oauth_access_token (
  id uuid default pg_catalog.gen_random_uuid() not null primary key,
  token text not null unique,
  client_id text not null references oauth_client (client_id) on delete cascade,
  session_id uuid references session (id) on delete set null,
  user_id uuid references "user" (id) on delete cascade,
  reference_id text,
  refresh_id uuid references oauth_refresh_token (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null,
  scopes jsonb not null
);

create index oauth_access_token_client_id_idx
  on oauth_access_token (client_id);

create index oauth_access_token_session_id_idx
  on oauth_access_token (session_id);

create index oauth_access_token_user_id_idx
  on oauth_access_token (user_id);

create index oauth_access_token_refresh_id_idx
  on oauth_access_token (refresh_id);

create table oauth_consent (
  id uuid default pg_catalog.gen_random_uuid() not null primary key,
  client_id text not null references oauth_client (client_id) on delete cascade,
  user_id uuid references "user" (id) on delete cascade,
  reference_id text,
  scopes jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index oauth_consent_client_id_idx
  on oauth_consent (client_id);

create index oauth_consent_user_id_idx
  on oauth_consent (user_id);
