CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Agente',
    status TEXT NOT NULL DEFAULT 'Activo',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
    id TEXT NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user(id),
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    identifier TEXT NOT NULL,
    initials TEXT NOT NULL,
    role_or_industry TEXT NOT NULL,
    status TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT NOT NULL,
    avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS search_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user(id),
    query TEXT NOT NULL,
    results_count INTEGER NOT NULL,
    ip_address TEXT,
    created_at INTEGER NOT NULL
);
