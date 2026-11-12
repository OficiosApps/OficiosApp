ALTER TABLE staff_invites ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending','sending','sent','failed','uncertain'));
ALTER TABLE staff_invites ADD COLUMN delivery_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff_invites ADD COLUMN delivery_attempted_at INTEGER;
ALTER TABLE staff_invites ADD COLUMN delivery_sent_at INTEGER;
ALTER TABLE staff_invites ADD COLUMN delivery_error TEXT;
ALTER TABLE staff_invites ADD COLUMN delivery_provider_id TEXT;
CREATE INDEX staff_invites_sender_email ON staff_invites(invited_by,email,role,expires_at);
