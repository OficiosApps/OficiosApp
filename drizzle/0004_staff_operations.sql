CREATE TABLE operations_cases (
 id TEXT PRIMARY KEY NOT NULL,
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 category TEXT NOT NULL,
 priority TEXT NOT NULL CHECK(priority IN ('baja','media','alta','critica')),
 status TEXT NOT NULL CHECK(status IN ('nuevo','en_curso','escalado','resuelto')),
 city_id TEXT NOT NULL DEFAULT '',
 account_id TEXT REFERENCES accounts(user_id),
 job_id TEXT REFERENCES jobs(id),
 assignee_id TEXT,
 created_by TEXT NOT NULL,
 due_at INTEGER NOT NULL,
 resolution TEXT NOT NULL DEFAULT '',
 resolved_at INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 update_token TEXT NOT NULL
);
CREATE INDEX operations_cases_queue ON operations_cases(status,priority,due_at);
CREATE INDEX operations_cases_assignee ON operations_cases(assignee_id,status);
CREATE INDEX operations_jobs_created ON jobs(created_at);
CREATE INDEX operations_jobs_updated ON jobs(updated_at DESC,id);
CREATE INDEX operations_accounts_city ON accounts(city_id,kind,verification);
CREATE INDEX operations_accounts_updated ON accounts(updated_at DESC,user_id);
CREATE TABLE operations_notes (
 id TEXT PRIMARY KEY NOT NULL,
 case_id TEXT NOT NULL REFERENCES operations_cases(id),
 author_id TEXT NOT NULL,
 author_name TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX operations_notes_case ON operations_notes(case_id,created_at);
CREATE TABLE operations_audit (
 id TEXT PRIMARY KEY NOT NULL,
 actor_id TEXT NOT NULL,
 actor_name TEXT NOT NULL,
 actor_role TEXT NOT NULL,
 action TEXT NOT NULL,
 entity_type TEXT NOT NULL,
 entity_id TEXT NOT NULL,
 summary TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX operations_audit_created ON operations_audit(created_at);
CREATE TABLE staff_access_controls (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES staff(user_id),
 paused INTEGER NOT NULL CHECK(paused IN (0,1)),
 reason TEXT NOT NULL,
 version INTEGER NOT NULL,
 update_token TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE operations_profile_controls (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(user_id),
 hidden INTEGER NOT NULL CHECK(hidden IN (0,1)),
 reason TEXT NOT NULL,
 version INTEGER NOT NULL,
 update_token TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE operations_settings (
 id TEXT PRIMARY KEY NOT NULL,
 body TEXT NOT NULL,
 version INTEGER NOT NULL,
 update_token TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
INSERT INTO operations_settings VALUES('service','{"responseHours":24,"resolutionHours":72,"unansweredHours":24}',1,'initial',0);
