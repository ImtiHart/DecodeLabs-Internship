/**
 * DecodeLabs — Project 3: Database Integration
 * Express API backed by SQLite via sql.js (pure JS, no native build needed).
 *
 * Run:  node server.js
 */

const express = require('express');
const db      = require('./db/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/users',   require('./routes/users'));
app.use('/api/tags',    require('./routes/tags'));
app.use('/api/schema',  require('./routes/schema'));

app.get('/api/health', (_req, res) => {
  const stats = db.schema.stats();
  res.json({
    success: true, status: 200,
    message: 'API is healthy',
    database: 'SQLite (sql.js)',
    records: stats,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'DecodeLabs Project 3 API',
    version: '1.0.0',
    database: 'SQLite — persistent, file-based',
    endpoints: [
      'GET  /api/health',
      'GET  /api/schema',
      'GET  /api/recipes          ?category= ?level= ?user_id=',
      'POST /api/recipes',
      'GET  /api/recipes/:id      (includes tags)',
      'PUT  /api/recipes/:id',
      'DELETE /api/recipes/:id',
      'POST /api/recipes/:id/tags',
      'DELETE /api/recipes/:id/tags/:tag_id',
      'GET  /api/users',
      'POST /api/users',
      'GET  /api/users/:id',
      'GET  /api/users/:id/recipes',
      'GET  /api/tags',
      'POST /api/tags',
    ],
  });
});

app.use(notFound);
app.use(errorHandler);

// ── Async boot — wait for DB before listening ─────────────────────────────────
(async () => {
  try {
    await db.connect();
    app.listen(PORT, () => {
      console.log(`\n🚀  DecodeLabs API → http://localhost:${PORT}`);
      console.log(`    Schema browser → http://localhost:${PORT}/api/schema\n`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
})();

module.exports = app;
