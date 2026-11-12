CREATE TABLE market_settings (
 setting_key TEXT PRIMARY KEY NOT NULL,
 body TEXT NOT NULL,
 version INTEGER NOT NULL,
 update_token TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE commercial_audit (
 id TEXT PRIMARY KEY NOT NULL,
 actor_id TEXT NOT NULL,
 action TEXT NOT NULL,
 entity_id TEXT NOT NULL,
 before_json TEXT NOT NULL,
 after_json TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX commercial_audit_created_idx ON commercial_audit(created_at);
CREATE TABLE referral_codes (
 owner_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(user_id),
 code TEXT UNIQUE NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE referrals (
 id TEXT PRIMARY KEY NOT NULL,
 referrer_id TEXT NOT NULL REFERENCES accounts(user_id),
 referred_id TEXT UNIQUE NOT NULL REFERENCES accounts(user_id),
 rules_json TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 qualified_at INTEGER
);
CREATE INDEX referrals_referrer_idx ON referrals(referrer_id, created_at);
CREATE TABLE referral_rewards (
 referral_id TEXT PRIMARY KEY NOT NULL REFERENCES referrals(id),
 owner_id TEXT NOT NULL REFERENCES accounts(user_id),
 amount INTEGER NOT NULL,
 month_key TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX referral_rewards_owner_idx ON referral_rewards(owner_id, expires_at);
