CREATE TABLE railway_sessions (
 token_hash TEXT PRIMARY KEY NOT NULL,
 user_json TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX railway_sessions_expiry ON railway_sessions(expires_at);
CREATE TABLE railway_oauth_flows (
 state_hash TEXT PRIMARY KEY NOT NULL,
 verifier TEXT NOT NULL,
 nonce TEXT NOT NULL,
 return_to TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX railway_oauth_expiry ON railway_oauth_flows(expires_at);
