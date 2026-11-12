CREATE TABLE client_selfie_uploads (
 id TEXT PRIMARY KEY NOT NULL,
 owner_id TEXT NOT NULL,
 object_key TEXT NOT NULL,
 mime TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 claimed_at INTEGER
);
CREATE INDEX client_selfie_owner_idx ON client_selfie_uploads(owner_id, created_at);
