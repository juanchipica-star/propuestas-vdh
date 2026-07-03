CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  service_type TEXT CHECK (service_type IN (
    'coaching', 'executive_search', 'talent_acquisition', 'talent_search',
    'market_insights', 'assessment', 'selfplacement', 'future_quest', 'institucional'
  )),
  language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  has_client_placeholder INTEGER NOT NULL DEFAULT 0,
  file_path TEXT,
  drive_file_id TEXT UNIQUE,
  drive_link TEXT,
  category TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  service_type TEXT CHECK (service_type IN (
    'coaching', 'executive_search', 'talent_acquisition', 'talent_search',
    'market_insights', 'assessment', 'selfplacement', 'future_quest', 'institucional'
  )),
  file_path TEXT,
  drive_file_id TEXT,
  drive_link TEXT,
  status TEXT NOT NULL DEFAULT 'borrador'
    CHECK (status IN ('borrador', 'enviada', 'pendiente', 'aprobada', 'rechazada')),
  base_salary REAL,
  payments_per_year REAL,
  bonus_pct REAL,
  fee_pct REAL,
  pricing_snapshot TEXT,
  sent_at TEXT,
  responded_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proposal_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_status_history_proposal ON proposal_status_history(proposal_id);
