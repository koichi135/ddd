-- ============================================================
-- Dungeon Crawler – SQLite Save-Data Schema
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ────────────────────────────────────────────────────────────
-- 1. saves – セーブスロット管理
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saves (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slot        INTEGER NOT NULL UNIQUE CHECK (slot BETWEEN 1 AND 3),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────────
-- 2. players – プレイヤー情報
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id INTEGER NOT NULL UNIQUE REFERENCES saves(id) ON DELETE CASCADE,
  name  TEXT    NOT NULL DEFAULT '冒険者',
  level INTEGER NOT NULL DEFAULT 1  CHECK (level >= 1),
  exp   INTEGER NOT NULL DEFAULT 0  CHECK (exp   >= 0),
  hp    INTEGER NOT NULL DEFAULT 100 CHECK (hp   >= 0),
  gold  INTEGER NOT NULL DEFAULT 0  CHECK (gold  >= 0),
  steps INTEGER NOT NULL DEFAULT 0  CHECK (steps >= 0)
);

-- ────────────────────────────────────────────────────────────
-- 3. items – アイテム在庫
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id   INTEGER NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  item_type TEXT    NOT NULL,
  quantity  INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE (save_id, item_type)
);

-- ────────────────────────────────────────────────────────────
-- 4. game_progress – ゲーム進行状況
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_progress (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id             INTEGER NOT NULL UNIQUE REFERENCES saves(id) ON DELETE CASCADE,
  floor               INTEGER NOT NULL DEFAULT 0 CHECK (floor >= 0),
  player_x            INTEGER NOT NULL DEFAULT 1,
  player_y            INTEGER NOT NULL DEFAULT 1,
  player_dir          TEXT    NOT NULL DEFAULT 'N' CHECK (player_dir IN ('N', 'S', 'E', 'W')),
  boss_defeated       INTEGER NOT NULL DEFAULT 0 CHECK (boss_defeated IN (0, 1)),
  built_bases         TEXT    NOT NULL DEFAULT '[]',
  last_rested_base_x     INTEGER,
  last_rested_base_y     INTEGER,
  last_rested_base_floor INTEGER
);

-- ────────────────────────────────────────────────────────────
-- 5. settings – 設定情報
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id INTEGER NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  key     TEXT    NOT NULL,
  value   TEXT,
  UNIQUE (save_id, key)
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_items_save       ON items(save_id);
CREATE INDEX IF NOT EXISTS idx_settings_save    ON settings(save_id);
CREATE INDEX IF NOT EXISTS idx_settings_key     ON settings(save_id, key);
