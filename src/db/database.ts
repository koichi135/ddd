import initSqlJs, { type Database } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

// ── Types ───────────────────────────────────────────────────

export type Direction = 'N' | 'S' | 'E' | 'W'

export interface PlayerRow {
  name: string
  level: number
  exp: number
  hp: number
  gold: number
  steps: number
}

export interface ItemRow {
  item_type: string
  quantity: number
}

export interface GameProgressRow {
  floor: number
  player_x: number
  player_y: number
  player_dir: Direction
  boss_defeated: boolean
  built_bases: string[]
  last_rested_base: { x: number; y: number; floor: number } | null
}

export interface SettingRow {
  key: string
  value: string | null
}

export interface FullSaveData {
  slot: number
  player: PlayerRow
  items: ItemRow[]
  progress: GameProgressRow
  settings: SettingRow[]
  updatedAt: string
}

// ── Schema ──────────────────────────────────────────────────

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS saves (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slot        INTEGER NOT NULL UNIQUE CHECK (slot BETWEEN 1 AND 3),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS players (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id INTEGER NOT NULL UNIQUE REFERENCES saves(id) ON DELETE CASCADE,
  name    TEXT    NOT NULL DEFAULT '冒険者',
  level   INTEGER NOT NULL DEFAULT 1  CHECK (level >= 1),
  exp     INTEGER NOT NULL DEFAULT 0  CHECK (exp   >= 0),
  hp      INTEGER NOT NULL DEFAULT 100 CHECK (hp   >= 0),
  gold    INTEGER NOT NULL DEFAULT 0  CHECK (gold  >= 0),
  steps   INTEGER NOT NULL DEFAULT 0  CHECK (steps >= 0)
);

CREATE TABLE IF NOT EXISTS items (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id   INTEGER NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  item_type TEXT    NOT NULL,
  quantity  INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE (save_id, item_type)
);

CREATE TABLE IF NOT EXISTS game_progress (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id                INTEGER NOT NULL UNIQUE REFERENCES saves(id) ON DELETE CASCADE,
  floor                  INTEGER NOT NULL DEFAULT 0 CHECK (floor >= 0),
  player_x               INTEGER NOT NULL DEFAULT 1,
  player_y               INTEGER NOT NULL DEFAULT 1,
  player_dir             TEXT    NOT NULL DEFAULT 'N' CHECK (player_dir IN ('N','S','E','W')),
  boss_defeated          INTEGER NOT NULL DEFAULT 0 CHECK (boss_defeated IN (0, 1)),
  built_bases            TEXT    NOT NULL DEFAULT '[]',
  last_rested_base_x     INTEGER,
  last_rested_base_y     INTEGER,
  last_rested_base_floor INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  save_id INTEGER NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  key     TEXT    NOT NULL,
  value   TEXT,
  UNIQUE (save_id, key)
);
`

// ── Database class ──────────────────────────────────────────

const STORAGE_KEY = 'dungeon-crawler-db'

export class GameDatabase {
  private db: Database

  private constructor(db: Database) {
    this.db = db
  }

  /** Initialize sql.js and open (or create) the database */
  static async open(): Promise<GameDatabase> {
    const SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl,
    })

    // Restore from localStorage if available
    const stored = localStorage.getItem(STORAGE_KEY)
    let db: Database

    if (stored) {
      const buf = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))
      db = new SQL.Database(buf)
    } else {
      db = new SQL.Database()
    }

    db.run(SCHEMA)
    const instance = new GameDatabase(db)
    instance.persist()
    return instance
  }

  /** Open with an existing sql.js Database instance (for testing) */
  static openWith(db: Database): GameDatabase {
    db.run(SCHEMA)
    return new GameDatabase(db)
  }

  // ── Persistence ─────────────────────────────────────────

  /** Write the current DB bytes to localStorage */
  persist(): void {
    const data = this.db.export()
    // Use chunked conversion to avoid "Maximum call stack size exceeded"
    // when spreading large Uint8Arrays as function arguments
    const CHUNK = 8192
    const chunks: string[] = []
    for (let i = 0; i < data.length; i += CHUNK) {
      chunks.push(String.fromCharCode(...data.subarray(i, i + CHUNK)))
    }
    localStorage.setItem(STORAGE_KEY, btoa(chunks.join('')))
  }

  /** Close the database */
  close(): void {
    this.db.close()
  }

  // ── Save Slot CRUD ──────────────────────────────────────

  /** Create a new save slot (1-3). Returns the save id. */
  createSave(slot: number): number {
    this.db.run(
      `INSERT INTO saves (slot) VALUES (?)
       ON CONFLICT(slot) DO UPDATE SET updated_at = datetime('now')`,
      [slot],
    )
    const rows = this.db.exec('SELECT id FROM saves WHERE slot = ?', [slot])
    const saveId = rows[0].values[0][0] as number

    // Ensure related rows exist
    this.db.run(
      `INSERT OR IGNORE INTO players (save_id) VALUES (?)`,
      [saveId],
    )
    this.db.run(
      `INSERT OR IGNORE INTO game_progress (save_id) VALUES (?)`,
      [saveId],
    )
    this.db.run(
      `INSERT INTO items (save_id, item_type, quantity) VALUES (?, 'potion', 3)
       ON CONFLICT(save_id, item_type) DO NOTHING`,
      [saveId],
    )

    this.persist()
    return saveId
  }

  /** Delete a save slot and all associated data */
  deleteSave(slot: number): void {
    this.db.run('DELETE FROM saves WHERE slot = ?', [slot])
    this.persist()
  }

  /** List existing save slots with summary info */
  listSaves(): { slot: number; name: string; level: number; updatedAt: string }[] {
    const rows = this.db.exec(`
      SELECT s.slot, p.name, p.level, s.updated_at
      FROM saves s
      JOIN players p ON p.save_id = s.id
      ORDER BY s.slot
    `)
    if (!rows.length) return []
    return rows[0].values.map((r) => ({
      slot: r[0] as number,
      name: r[1] as string,
      level: r[2] as number,
      updatedAt: r[3] as string,
    }))
  }

  // ── Helpers ─────────────────────────────────────────────

  private getSaveId(slot: number): number | null {
    const rows = this.db.exec('SELECT id FROM saves WHERE slot = ?', [slot])
    if (!rows.length || !rows[0].values.length) return null
    return rows[0].values[0][0] as number
  }

  // ── Player CRUD ─────────────────────────────────────────

  getPlayer(slot: number): PlayerRow | null {
    const rows = this.db.exec(
      `SELECT p.name, p.level, p.exp, p.hp, p.gold, p.steps
       FROM players p JOIN saves s ON s.id = p.save_id
       WHERE s.slot = ?`,
      [slot],
    )
    if (!rows.length || !rows[0].values.length) return null
    const [name, level, exp, hp, gold, steps] = rows[0].values[0]
    return {
      name: name as string,
      level: level as number,
      exp: exp as number,
      hp: hp as number,
      gold: gold as number,
      steps: steps as number,
    }
  }

  updatePlayer(slot: number, data: Partial<PlayerRow>): void {
    const saveId = this.getSaveId(slot)
    if (saveId === null) return

    const fields: string[] = []
    const values: (string | number)[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.level !== undefined) { fields.push('level = ?'); values.push(data.level) }
    if (data.exp !== undefined) { fields.push('exp = ?'); values.push(data.exp) }
    if (data.hp !== undefined) { fields.push('hp = ?'); values.push(data.hp) }
    if (data.gold !== undefined) { fields.push('gold = ?'); values.push(data.gold) }
    if (data.steps !== undefined) { fields.push('steps = ?'); values.push(data.steps) }

    if (!fields.length) return

    this.db.run(
      `UPDATE players SET ${fields.join(', ')} WHERE save_id = ?`,
      [...values, saveId],
    )
    this.db.run(
      `UPDATE saves SET updated_at = datetime('now') WHERE id = ?`,
      [saveId],
    )
    this.persist()
  }

  // ── Items CRUD ──────────────────────────────────────────

  getItems(slot: number): ItemRow[] {
    const rows = this.db.exec(
      `SELECT i.item_type, i.quantity
       FROM items i JOIN saves s ON s.id = i.save_id
       WHERE s.slot = ?`,
      [slot],
    )
    if (!rows.length) return []
    return rows[0].values.map((r) => ({
      item_type: r[0] as string,
      quantity: r[1] as number,
    }))
  }

  setItem(slot: number, itemType: string, quantity: number): void {
    const saveId = this.getSaveId(slot)
    if (saveId === null) return

    this.db.run(
      `INSERT INTO items (save_id, item_type, quantity) VALUES (?, ?, ?)
       ON CONFLICT(save_id, item_type) DO UPDATE SET quantity = excluded.quantity`,
      [saveId, itemType, quantity],
    )
    this.db.run(
      `UPDATE saves SET updated_at = datetime('now') WHERE id = ?`,
      [saveId],
    )
    this.persist()
  }

  // ── Game Progress CRUD ──────────────────────────────────

  getProgress(slot: number): GameProgressRow | null {
    const rows = this.db.exec(
      `SELECT g.floor, g.player_x, g.player_y, g.player_dir,
              g.boss_defeated, g.built_bases,
              g.last_rested_base_x, g.last_rested_base_y, g.last_rested_base_floor
       FROM game_progress g JOIN saves s ON s.id = g.save_id
       WHERE s.slot = ?`,
      [slot],
    )
    if (!rows.length || !rows[0].values.length) return null
    const [
      floor, px, py, dir, boss, bases,
      lrbX, lrbY, lrbFloor,
    ] = rows[0].values[0]

    return {
      floor: floor as number,
      player_x: px as number,
      player_y: py as number,
      player_dir: dir as Direction,
      boss_defeated: (boss as number) === 1,
      built_bases: JSON.parse(bases as string) as string[],
      last_rested_base:
        lrbX !== null
          ? { x: lrbX as number, y: lrbY as number, floor: lrbFloor as number }
          : null,
    }
  }

  updateProgress(slot: number, data: Partial<GameProgressRow>): void {
    const saveId = this.getSaveId(slot)
    if (saveId === null) return

    const fields: string[] = []
    const values: (string | number)[] = []

    if (data.floor !== undefined) { fields.push('floor = ?'); values.push(data.floor) }
    if (data.player_x !== undefined) { fields.push('player_x = ?'); values.push(data.player_x) }
    if (data.player_y !== undefined) { fields.push('player_y = ?'); values.push(data.player_y) }
    if (data.player_dir !== undefined) { fields.push('player_dir = ?'); values.push(data.player_dir) }
    if (data.boss_defeated !== undefined) {
      fields.push('boss_defeated = ?')
      values.push(data.boss_defeated ? 1 : 0)
    }
    if (data.built_bases !== undefined) {
      fields.push('built_bases = ?')
      values.push(JSON.stringify(data.built_bases))
    }
    if (data.last_rested_base !== undefined) {
      if (data.last_rested_base === null) {
        fields.push('last_rested_base_x = NULL, last_rested_base_y = NULL, last_rested_base_floor = NULL')
      } else {
        fields.push('last_rested_base_x = ?, last_rested_base_y = ?, last_rested_base_floor = ?')
        values.push(data.last_rested_base.x, data.last_rested_base.y, data.last_rested_base.floor)
      }
    }

    if (!fields.length) return

    this.db.run(
      `UPDATE game_progress SET ${fields.join(', ')} WHERE save_id = ?`,
      [...values, saveId],
    )
    this.db.run(
      `UPDATE saves SET updated_at = datetime('now') WHERE id = ?`,
      [saveId],
    )
    this.persist()
  }

  // ── Settings CRUD ───────────────────────────────────────

  getSetting(slot: number, key: string): string | null {
    const rows = this.db.exec(
      `SELECT st.value
       FROM settings st JOIN saves s ON s.id = st.save_id
       WHERE s.slot = ? AND st.key = ?`,
      [slot, key],
    )
    if (!rows.length || !rows[0].values.length) return null
    return rows[0].values[0][0] as string | null
  }

  getSettings(slot: number): SettingRow[] {
    const rows = this.db.exec(
      `SELECT st.key, st.value
       FROM settings st JOIN saves s ON s.id = st.save_id
       WHERE s.slot = ?`,
      [slot],
    )
    if (!rows.length) return []
    return rows[0].values.map((r) => ({
      key: r[0] as string,
      value: r[1] as string | null,
    }))
  }

  setSetting(slot: number, key: string, value: string | null): void {
    const saveId = this.getSaveId(slot)
    if (saveId === null) return

    this.db.run(
      `INSERT INTO settings (save_id, key, value) VALUES (?, ?, ?)
       ON CONFLICT(save_id, key) DO UPDATE SET value = excluded.value`,
      [saveId, key, value],
    )
    this.persist()
  }

  deleteSetting(slot: number, key: string): void {
    const saveId = this.getSaveId(slot)
    if (saveId === null) return

    this.db.run(
      `DELETE FROM settings WHERE save_id = ? AND key = ?`,
      [saveId, key],
    )
    this.persist()
  }

  // ── Full Save / Load ───────────────────────────────────

  /** Load all data for a save slot */
  loadFull(slot: number): FullSaveData | null {
    const player = this.getPlayer(slot)
    const progress = this.getProgress(slot)
    if (!player || !progress) return null

    const rows = this.db.exec(
      'SELECT updated_at FROM saves WHERE slot = ?',
      [slot],
    )
    const updatedAt = rows[0]?.values[0]?.[0] as string ?? ''

    return {
      slot,
      player,
      items: this.getItems(slot),
      progress,
      settings: this.getSettings(slot),
      updatedAt,
    }
  }

  /** Write all data for a save slot at once */
  saveFull(slot: number, data: Omit<FullSaveData, 'slot' | 'updatedAt'>): void {
    this.createSave(slot)
    this.updatePlayer(slot, data.player)
    for (const item of data.items) {
      this.setItem(slot, item.item_type, item.quantity)
    }
    this.updateProgress(slot, data.progress)
    for (const setting of data.settings) {
      this.setSetting(slot, setting.key, setting.value)
    }
  }
}
