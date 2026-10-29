PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS access_requests (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE,
 organization TEXT NOT NULL,
 project TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked')),
 created_at INTEGER NOT NULL,
 approved_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 request_id TEXT REFERENCES access_requests(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('visitor','password','admin')),
 expires_at INTEGER NOT NULL,
 password_fingerprint TEXT
);
CREATE TABLE IF NOT EXISTS login_tokens (
 token_hash TEXT PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES access_requests(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_request ON sessions(request_id);
CREATE INDEX IF NOT EXISTS sessions_expiration ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS tokens_request ON login_tokens(request_id);
CREATE INDEX IF NOT EXISTS tokens_expiration ON login_tokens(expires_at);
CREATE INDEX IF NOT EXISTS rate_expiration ON rate_limits(expires_at);
