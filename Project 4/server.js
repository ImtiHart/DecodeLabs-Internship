/**
 * DecodeLabs — Project 4: Full Stack Integration
 * The backend from P3, now with CORS enabled so the P1 frontend can call it.
 */

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const initSqlJs  = require('./node_modules/sql.js');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'hearth.sqlite');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());                          // allow cross-origin fetch from the frontend
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serve the frontend

// ── DB Layer ──────────────────────────────────────────────────────────────────
let db;

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function queryOne(sql, params = []) { return query(sql, params)[0] ?? null; }
function run(sql, params = []) {
  db.run(sql, params);
  const m = queryOne('SELECT changes() AS c, last_insert_rowid() AS id');
  persist();
  return { changes: m.c, lastId: m.id };
}
function persist() {
  try { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); } catch(e) {}
}

function parseRecipe(r) {
  return { ...r,
    ingredients: tryParse(r.ingredients, []),
    steps:       tryParse(r.steps,       []),
  };
}
function tryParse(v, f) { try { return JSON.parse(v); } catch { return f; } }

// ── Schema + Seed ─────────────────────────────────────────────────────────────
function initDB() {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(trim(name))>=2),
    email TEXT NOT NULL UNIQUE CHECK(email LIKE '%@%'),
    password TEXT NOT NULL CHECK(length(password)>=8),
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN('admin','member')),
    created_at TEXT NOT NULL DEFAULT(datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK(length(trim(title))>=3),
    category TEXT NOT NULL CHECK(category IN('Soups & Stews','Baking','Salads','Mains','Desserts')),
    ingredients TEXT NOT NULL,
    steps TEXT NOT NULL,
    time_mins INTEGER CHECK(time_mins IS NULL OR time_mins>0),
    serves INTEGER CHECK(serves IS NULL OR serves>0),
    level TEXT NOT NULL DEFAULT 'Easy' CHECK(level IN('Easy','Medium','Hard')),
    created_at TEXT NOT NULL DEFAULT(datetime('now')),
    updated_at TEXT
  )`);

  // Seed only if empty
  const n = queryOne('SELECT COUNT(*) AS n FROM users').n;
  if (n === 0) {
    run('INSERT INTO users(name,email,password,role)VALUES(?,?,?,?)',
      ['Ada Lovelace','ada@example.com','password_ada','admin']);
    run('INSERT INTO users(name,email,password,role)VALUES(?,?,?,?)',
      ['Grace Hopper','grace@example.com','password_grace','member']);

    const seed = [
      [1,'Slow Lentil & Smoked Paprika Soup','Soups & Stews',
       '["red lentils","smoked paprika","onion","garlic","vegetable stock"]',
       '["Sauté onion and garlic.","Add lentils and stock.","Simmer 30 min.","Blend half, season."]',
       45,4,'Easy'],
      [1,'Coconut Chickpea Curry','Mains',
       '["chickpeas","coconut milk","tomatoes","garam masala","coriander"]',
       '["Fry spices.","Add tomatoes and chickpeas.","Pour coconut milk.","Simmer 20 min."]',
       35,4,'Easy'],
      [2,'Olive Oil & Orange Cake','Desserts',
       '["olive oil","orange zest","eggs","sugar","flour","baking powder"]',
       '["Whisk eggs and sugar.","Fold in oil and zest.","Combine dry ingredients.","Bake 45 min at 180°C."]',
       60,10,'Medium'],
      [1,'Garlic Chilli Noodles','Mains',
       '["noodles","garlic","chilli oil","soy sauce","sesame seeds"]',
       '["Boil noodles.","Fry garlic in chilli oil.","Toss noodles with sauce.","Top with sesame seeds."]',
       15,2,'Easy'],
      [2,'Sunday Sourdough Loaf','Baking',
       '["bread flour","water","sourdough starter","salt"]',
       '["Mix flour and water, rest 30 min.","Add starter and salt.","Fold every 30 min × 4.","Proof overnight.","Bake in Dutch oven 45 min."]',
       180,8,'Medium'],
      [1,'Charred Corn & Lime Salad','Salads',
       '["corn cobs","lime juice","coriander","red onion","jalapeño","feta"]',
       '["Char corn on griddle pan.","Slice kernels off.","Toss with all ingredients.","Season and serve."]',
       20,4,'Easy'],
    ];
    seed.forEach(s => run(
      'INSERT INTO recipes(user_id,title,category,ingredients,steps,time_mins,serves,level)VALUES(?,?,?,?,?,?,?,?)',s));
    console.log('🌱  Seeded database');
  }
}

// ── API Routes ────────────────────────────────────────────────────────────────

// Health
app.get('/api/health', (_req, res) => {
  res.json({ success:true, status:200, message:'API is healthy',
    stats:{ recipes: queryOne('SELECT COUNT(*) AS n FROM recipes').n,
            users:   queryOne('SELECT COUNT(*) AS n FROM users').n } });
});

// GET /api/recipes
app.get('/api/recipes', (req, res) => {
  let sql    = 'SELECT r.*,u.name AS author FROM recipes r JOIN users u ON u.id=r.user_id WHERE 1=1';
  const p    = [];
  if (req.query.category) { sql += ' AND r.category=?'; p.push(req.query.category); }
  if (req.query.level)    { sql += ' AND r.level=?';    p.push(req.query.level); }
  sql += ' ORDER BY r.id DESC';
  res.json({ success:true, count: query(sql,p).length, data: query(sql,p).map(parseRecipe) });
});

// GET /api/recipes/:id
app.get('/api/recipes/:id', (req, res) => {
  const id  = parseInt(req.params.id);
  const row = queryOne('SELECT r.*,u.name AS author FROM recipes r JOIN users u ON u.id=r.user_id WHERE r.id=?',[id]);
  if (!row) return res.status(404).json({ success:false, message:`Recipe ${id} not found.` });
  res.json({ success:true, data: parseRecipe(row) });
});

// POST /api/recipes
app.post('/api/recipes', (req, res) => {
  const { title, category, ingredients, steps, time_mins, serves, level, user_id=1 } = req.body;
  const errors = [];
  if (!title || title.trim().length < 3) errors.push('title required (min 3 chars)');
  if (!['Soups & Stews','Baking','Salads','Mains','Desserts'].includes(category)) errors.push('invalid category');
  if (!Array.isArray(ingredients) || !ingredients.length) errors.push('ingredients must be non-empty array');
  if (!Array.isArray(steps)       || !steps.length)       errors.push('steps must be non-empty array');
  if (errors.length) return res.status(400).json({ success:false, errors });

  try {
    const { lastId } = run(
      'INSERT INTO recipes(user_id,title,category,ingredients,steps,time_mins,serves,level)VALUES(?,?,?,?,?,?,?,?)',
      [user_id, title.trim(), category, JSON.stringify(ingredients), JSON.stringify(steps),
       time_mins||null, serves||null, level||'Easy']
    );
    const recipe = parseRecipe(queryOne('SELECT r.*,u.name AS author FROM recipes r JOIN users u ON u.id=r.user_id WHERE r.id=?',[lastId]));
    res.status(201).json({ success:true, status:201, message:'Recipe created.', data:recipe });
  } catch(e) {
    res.status(500).json({ success:false, message: e.message });
  }
});

// PUT /api/recipes/:id
app.put('/api/recipes/:id', (req, res) => {
  const id  = parseInt(req.params.id);
  if (!queryOne('SELECT id FROM recipes WHERE id=?',[id]))
    return res.status(404).json({ success:false, message:'Not found.' });

  const allowed = ['title','category','ingredients','steps','time_mins','serves','level'];
  const sets=[], params=[];
  for (const [k,v] of Object.entries(req.body)) {
    if (!allowed.includes(k)) continue;
    sets.push(`${k}=?`);
    params.push(Array.isArray(v) ? JSON.stringify(v) : v);
  }
  if (!sets.length) return res.status(400).json({ success:false, message:'No valid fields provided.' });
  sets.push(`updated_at=datetime('now')`);
  params.push(id);
  run(`UPDATE recipes SET ${sets.join(',')} WHERE id=?`, params);
  const recipe = parseRecipe(queryOne('SELECT r.*,u.name AS author FROM recipes r JOIN users u ON u.id=r.user_id WHERE r.id=?',[id]));
  res.json({ success:true, data:recipe });
});

// DELETE /api/recipes/:id
app.delete('/api/recipes/:id', (req, res) => {
  const { changes } = run('DELETE FROM recipes WHERE id=?',[parseInt(req.params.id)]);
  if (!changes) return res.status(404).json({ success:false, message:'Not found.' });
  res.status(204).send();
});

// GET /api/users
app.get('/api/users', (_req, res) => {
  res.json({ success:true, data: query('SELECT id,name,email,role,created_at FROM users ORDER BY id') });
});

// POST /api/users
app.post('/api/users', (req, res) => {
  const { name, email, password } = req.body;
  const errors = [];
  if (!name || name.trim().length < 2) errors.push('name required (min 2 chars)');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('valid email required');
  if (!password || password.length < 8) errors.push('password min 8 chars');
  if (errors.length) return res.status(400).json({ success:false, errors });
  if (queryOne('SELECT id FROM users WHERE email=?',[email.toLowerCase()]))
    return res.status(409).json({ success:false, message:'Email already registered.' });
  try {
    const { lastId } = run('INSERT INTO users(name,email,password)VALUES(?,?,?)',
      [name.trim(), email.toLowerCase(), password]);
    const user = queryOne('SELECT id,name,email,role,created_at FROM users WHERE id=?',[lastId]);
    res.status(201).json({ success:true, data:user });
  } catch(e) {
    res.status(500).json({ success:false, message:e.message });
  }
});

// ── Catch-all: serve frontend for non-API routes ──────────────────────────────
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, _req, res, _next) => {
  res.status(err.status||500).json({ success:false, message:err.message });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();
  initDB();
  app.listen(PORT, () => {
    console.log(`\n🚀  Hearth & Home running → http://localhost:${PORT}`);
    console.log(`    API health          → http://localhost:${PORT}/api/health\n`);
  });
})();
