CREATE TABLE IF NOT EXISTS hymns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  theme TEXT NOT NULL DEFAULT '',
  lyrics TEXT NOT NULL DEFAULT '',
  last_selected_date TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS selection_history (
  target_date TEXT NOT NULL,
  hymn_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (target_date, hymn_id)
);
