/**
 * db/database.js
 *
 * Pillar 1 — The Blueprint: schema design
 * Pillar 2 — The Bridge:    sql.js connection (pure JS SQLite, no native build)
 * Pillar 4 — The Shield:    NOT NULL, UNIQUE, CHECK, FK constraints enforced at schema level
 *
 * Tables and relationships:
 *   users         (1)──(M)  recipes        [one user authors many recipes]
 *   recipes       (1)──(M)  recipe_tags    [junction — M:M via tags]
 *   tags          (1)──(M)  recipe_tags
 *
 * All user input reaches the DB only through parameterised statements (no string concat → no SQL injection).
 */

const initSqlJs = require('../node_modules/sql.js');
const path      = require('path');
const fs        = require('fs');

const DB_PATH = path.join(__dirname, 'hearth.sqlite');

let _db   = null;   // sql.js Database instance
let _SQL  = null;   // sql.js constructor namespace

// ── Boot ─────────────────────────────────────────────────────────────────────
async function connect() {
  if (_db) return _db;

  _SQL = await initSqlJs();

  // Load from disk if it exists, otherwise create fresh
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new _SQL.Database(fileBuffer);
    console.log('📂  Loaded existing database from', DB_PATH);
  } else {
    _db = new _SQL.Database();
    console.log('🆕  Created new in-memory database');
  }

  // Enable foreign key enforcement (SQLite disables it by default)
  _db.run('PRAGMA foreign_keys = ON;');
  _db.run('PRAGMA journal_mode = WAL;');

  await _createSchema();
  await _seed();

  persist(); // write initial state to disk
  return _db;
}

// ── Persist to disk (call after every write) ──────────────────────────────────
function persist() {
  if (!_db) return;
  try {
    const data = _db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('Persist error:', e.message);
  }
}

// ── Schema ────────────────────────────────────────────────────────────────────
async function _createSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL CHECK(length(trim(name)) >= 2),
      email      TEXT    NOT NULL UNIQUE CHECK(email LIKE '%@%'),
      password   TEXT    NOT NULL CHECK(length(password) >= 8),
      role       TEXT    NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL CHECK(length(trim(title)) >= 3),
      category    TEXT    NOT NULL CHECK(category IN ('Soups & Stews','Baking','Salads','Mains','Desserts')),
      ingredients TEXT    NOT NULL,   -- JSON array stored as text
      steps       TEXT    NOT NULL,   -- JSON array stored as text
      time_mins   INTEGER CHECK(time_mins IS NULL OR time_mins > 0),
      serves      INTEGER CHECK(serves IS NULL OR serves > 0),
      level       TEXT    NOT NULL DEFAULT 'Easy' CHECK(level IN ('Easy','Medium','Hard')),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT
    );
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT    NOT NULL UNIQUE CHECK(length(trim(name)) >= 1)
    );
  `);

  // Junction table: M:M between recipes and tags
  _db.run(`
    CREATE TABLE IF NOT EXISTS recipe_tags (
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      tag_id    INTEGER NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
      PRIMARY KEY (recipe_id, tag_id)
    );
  `);

  // Index for fast lookups
  _db.run(`CREATE INDEX IF NOT EXISTS idx_recipes_user    ON recipes(user_id);`);
  _db.run(`CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);`);
  _db.run(`CREATE INDEX IF NOT EXISTS idx_recipe_tags      ON recipe_tags(recipe_id);`);

  console.log('✅  Schema ready');
}

// ── Seed data ─────────────────────────────────────────────────────────────────
async function _seed() {
  const count = _queryOne('SELECT COUNT(*) AS n FROM users');
  if (count.n > 0) return; // already seeded

  // Users
  _db.run(`INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)`,
    ['Ada Lovelace',  'ada@example.com',   'password_ada',   'admin']);
  _db.run(`INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)`,
    ['Grace Hopper',  'grace@example.com', 'password_grace', 'member']);

  // Tags
  const tagNames = ['quick','comfort','vegetarian','baking','summer'];
  tagNames.forEach(t => _db.run(`INSERT INTO tags (name) VALUES (?)`, [t]));

  // Recipes
  _db.run(`INSERT INTO recipes (user_id, title, category, ingredients, steps, time_mins, serves, level) VALUES (?,?,?,?,?,?,?,?)`, [
    1, 'Slow Lentil & Smoked Paprika Soup', 'Soups & Stews',
    JSON.stringify(['red lentils','smoked paprika','onion','garlic','vegetable stock']),
    JSON.stringify(['Sauté onion and garlic.','Add lentils and stock.','Simmer 30 min.','Blend half, season.']),
    45, 4, 'Easy',
  ]);
  _db.run(`INSERT INTO recipes (user_id, title, category, ingredients, steps, time_mins, serves, level) VALUES (?,?,?,?,?,?,?,?)`, [
    1, 'Coconut Chickpea Curry', 'Mains',
    JSON.stringify(['chickpeas','coconut milk','tomatoes','garam masala','coriander']),
    JSON.stringify(['Fry spices.','Add tomatoes and chickpeas.','Pour coconut milk.','Simmer 20 min.']),
    35, 4, 'Easy',
  ]);
  _db.run(`INSERT INTO recipes (user_id, title, category, ingredients, steps, time_mins, serves, level) VALUES (?,?,?,?,?,?,?,?)`, [
    2, 'Olive Oil & Orange Cake', 'Desserts',
    JSON.stringify(['olive oil','orange zest','eggs','sugar','flour','baking powder']),
    JSON.stringify(['Whisk eggs and sugar.','Fold in oil and zest.','Combine dry ingredients.','Bake 45 min at 180°C.']),
    60, 10, 'Medium',
  ]);

  // Recipe-tag associations (M:M)
  _db.run(`INSERT INTO recipe_tags VALUES (1,1)`); // lentil soup → quick
  _db.run(`INSERT INTO recipe_tags VALUES (1,3)`); // lentil soup → vegetarian
  _db.run(`INSERT INTO recipe_tags VALUES (2,3)`); // curry → vegetarian
  _db.run(`INSERT INTO recipe_tags VALUES (3,4)`); // cake → baking

  console.log('🌱  Database seeded');
}

// ── Query helpers (parameterised — SQL injection safe) ────────────────────────

/** Run a SELECT and return all rows as plain objects */
function _query(sql, params = []) {
  const stmt    = _db.prepare(sql);
  const rows    = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/** Run a SELECT and return the first row or null */
function _queryOne(sql, params = []) {
  const rows = _query(sql, params);
  return rows[0] ?? null;
}

/** Run an INSERT/UPDATE/DELETE and return { changes, lastInsertRowid } */
function _run(sql, params = []) {
  _db.run(sql, params);
  const meta = _queryOne('SELECT changes() AS changes, last_insert_rowid() AS lastId');
  persist(); // write to disk after every mutation
  return { changes: meta.changes, lastInsertRowid: meta.lastId };
}

// ── Public DB API ─────────────────────────────────────────────────────────────
module.exports = {
  connect,
  persist,

  // ── Users ──────────────────────────────────────────────────────────────────
  users: {
    findAll() {
      return _query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
    },
    findById(id) {
      return _queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);
    },
    findByEmail(email) {
      return _queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    },
    create({ name, email, password }) {
      try {
        const { lastInsertRowid } = _run(
          'INSERT INTO users (name, email, password) VALUES (?,?,?)',
          [name.trim(), email.toLowerCase(), password]
        );
        return this.findById(lastInsertRowid);
      } catch (e) {
        if (e.message.includes('UNIQUE')) throw Object.assign(new Error('Email already registered.'), { status: 409 });
        throw e;
      }
    },
  },

  // ── Recipes ────────────────────────────────────────────────────────────────
  recipes: {
    findAll({ category, level, user_id } = {}) {
      let sql    = `SELECT r.*, u.name AS author FROM recipes r JOIN users u ON u.id = r.user_id WHERE 1=1`;
      const params = [];
      if (category) { sql += ' AND r.category = ?'; params.push(category); }
      if (level)    { sql += ' AND r.level = ?';    params.push(level); }
      if (user_id)  { sql += ' AND r.user_id = ?';  params.push(user_id); }
      sql += ' ORDER BY r.id DESC';
      const rows = _query(sql, params);
      return rows.map(_parseRecipe);
    },

    findById(id) {
      const row = _queryOne(
        'SELECT r.*, u.name AS author FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.id = ?',
        [id]
      );
      if (!row) return null;
      const recipe = _parseRecipe(row);
      // Attach tags (demonstrates JOIN + M:M)
      recipe.tags = _query(
        'SELECT t.id, t.name FROM tags t JOIN recipe_tags rt ON rt.tag_id = t.id WHERE rt.recipe_id = ?',
        [id]
      );
      return recipe;
    },

    create({ user_id, title, category, ingredients, steps, time_mins, serves, level }) {
      const { lastInsertRowid } = _run(
        `INSERT INTO recipes (user_id, title, category, ingredients, steps, time_mins, serves, level)
         VALUES (?,?,?,?,?,?,?,?)`,
        [user_id, title.trim(), category,
         JSON.stringify(ingredients), JSON.stringify(steps),
         time_mins ?? null, serves ?? null, level ?? 'Easy']
      );
      return this.findById(lastInsertRowid);
    },

    update(id, fields) {
      const allowed = ['title','category','ingredients','steps','time_mins','serves','level'];
      const sets    = [];
      const params  = [];

      for (const [key, val] of Object.entries(fields)) {
        if (!allowed.includes(key)) continue;
        sets.push(`${key} = ?`);
        params.push(Array.isArray(val) ? JSON.stringify(val) : val);
      }
      if (!sets.length) return this.findById(id);

      sets.push(`updated_at = datetime('now')`);
      params.push(id);
      _run(`UPDATE recipes SET ${sets.join(', ')} WHERE id = ?`, params);
      return this.findById(id);
    },

    remove(id) {
      const { changes } = _run('DELETE FROM recipes WHERE id = ?', [id]);
      return changes > 0;
    },
  },

  // ── Tags ───────────────────────────────────────────────────────────────────
  tags: {
    findAll() { return _query('SELECT * FROM tags ORDER BY name'); },
    findById(id) { return _queryOne('SELECT * FROM tags WHERE id = ?', [id]); },
    create(name) {
      try {
        const { lastInsertRowid } = _run('INSERT INTO tags (name) VALUES (?)', [name.trim()]);
        return this.findById(lastInsertRowid);
      } catch (e) {
        if (e.message.includes('UNIQUE')) throw Object.assign(new Error(`Tag "${name}" already exists.`), { status: 409 });
        throw e;
      }
    },
    addToRecipe(recipeId, tagId) {
      try {
        _run('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?,?)', [recipeId, tagId]);
        return true;
      } catch (e) {
        if (e.message.includes('UNIQUE') || e.message.includes('PRIMARY KEY')) return false; // already linked
        throw e;
      }
    },
    removeFromRecipe(recipeId, tagId) {
      const { changes } = _run('DELETE FROM recipe_tags WHERE recipe_id = ? AND tag_id = ?', [recipeId, tagId]);
      return changes > 0;
    },
  },

  // ── Schema info (for demo / docs endpoint) ─────────────────────────────────
  schema: {
    tables() {
      return _query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`);
    },
    describe(table) {
      return _query(`PRAGMA table_info(${table})`);
    },
    stats() {
      return {
        users:   _queryOne('SELECT COUNT(*) AS n FROM users').n,
        recipes: _queryOne('SELECT COUNT(*) AS n FROM recipes').n,
        tags:    _queryOne('SELECT COUNT(*) AS n FROM tags').n,
      };
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function _parseRecipe(row) {
  return {
    ...row,
    ingredients: _tryParse(row.ingredients, []),
    steps:       _tryParse(row.steps, []),
  };
}

function _tryParse(val, fallback) {
  try { return JSON.parse(val); } catch { return fallback; }
}
