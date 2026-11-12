CREATE TABLE accounts (
 user_id TEXT PRIMARY KEY NOT NULL,
 email TEXT NOT NULL,
 name TEXT NOT NULL,
 kind TEXT NOT NULL CHECK (kind IN ('cliente','profesional','empresa')),
 city_id TEXT NOT NULL,
 trade TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '',
 bio TEXT NOT NULL DEFAULT '',
 verification TEXT NOT NULL DEFAULT 'sin-enviar',
 identity_json TEXT NOT NULL DEFAULT '{}',
 profile_json TEXT NOT NULL DEFAULT '{}',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE jobs (
 id TEXT PRIMARY KEY NOT NULL,
 client_id TEXT NOT NULL REFERENCES accounts(user_id),
 category TEXT NOT NULL,
 city_id TEXT NOT NULL,
 state TEXT NOT NULL,
 professional_id TEXT,
 body TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX jobs_client_idx ON jobs(client_id, created_at);
CREATE INDEX jobs_market_idx ON jobs(category, city_id, state);
CREATE INDEX jobs_professional_idx ON jobs(professional_id, created_at);
CREATE TABLE addresses (
 id TEXT PRIMARY KEY NOT NULL,
 owner_id TEXT NOT NULL REFERENCES accounts(user_id),
 body TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX addresses_owner_idx ON addresses(owner_id);
CREATE TABLE uploads (
 id TEXT PRIMARY KEY NOT NULL,
 owner_id TEXT NOT NULL REFERENCES accounts(user_id),
 scope TEXT NOT NULL,
 object_key TEXT NOT NULL,
 mime TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX uploads_owner_idx ON uploads(owner_id);
CREATE TABLE works (
 id TEXT PRIMARY KEY NOT NULL,
 owner_id TEXT NOT NULL REFERENCES accounts(user_id),
 published INTEGER NOT NULL DEFAULT 0,
 body TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX works_owner_idx ON works(owner_id, published);
CREATE TABLE staff (
 user_id TEXT PRIMARY KEY NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('superadmin','admin')),
 invited_by TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE staff_invites (
 id TEXT PRIMARY KEY NOT NULL,
 email TEXT NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('superadmin','admin')),
 invited_by TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 used_by TEXT,
 created_at INTEGER NOT NULL
);
CREATE TABLE company_members (
 id TEXT PRIMARY KEY NOT NULL,
 company_id TEXT NOT NULL REFERENCES accounts(user_id),
 email TEXT NOT NULL,
 user_id TEXT,
 name TEXT NOT NULL,
 trade TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 UNIQUE(company_id, email)
);
