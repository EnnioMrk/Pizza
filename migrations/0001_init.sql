-- Pizza order system. Replaces the JSON files that wtf.php wrote.

CREATE TABLE IF NOT EXISTS menu_items (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT    NOT NULL CHECK (kind IN ('ingredient', 'option')),
  name TEXT    NOT NULL,
  pos  INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_unique ON menu_items (kind, name);

CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at  INTEGER NOT NULL,
  ingredients TEXT    NOT NULL,
  options     TEXT    NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions (active);

CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  name        TEXT    NOT NULL,
  comment     TEXT    NOT NULL DEFAULT '',
  ingredients TEXT    NOT NULL,
  options     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_session ON orders (session_id, id);
