/**
 * DecodeLabs — Project 2: Backend API
 * Entry point: boots Express and mounts all route modules.
 */

const express = require('express');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const recipesRouter = require('./routes/recipes');
const usersRouter  = require('./routes/users');
const healthRouter = require('./routes/health');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Global Middleware ────────────────────────────────────────────────────────
app.use(express.json());                  // parse application/json bodies
app.use(express.urlencoded({ extended: false })); // parse form bodies

// ── Request logger (lightweight, no dependency) ──────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health',   healthRouter);
app.use('/api/recipes',  recipesRouter);
app.use('/api/users',    usersRouter);

// ── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name:    'DecodeLabs Project 2 API',
    version: '1.0.0',
    docs:    'See README.md for endpoint reference',
    routes: [
      'GET  /api/health',
      'GET  /api/recipes',
      'POST /api/recipes',
      'GET  /api/recipes/:id',
      'PUT  /api/recipes/:id',
      'DELETE /api/recipes/:id',
      'GET  /api/users',
      'POST /api/users',
      'GET  /api/users/:id',
    ],
  });
});

// ── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  DecodeLabs API running → http://localhost:${PORT}`);
  console.log(`    Health check → http://localhost:${PORT}/api/health\n`);
});

module.exports = app; // exported for testing
