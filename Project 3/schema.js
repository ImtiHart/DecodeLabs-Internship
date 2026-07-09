const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// GET /api/schema — live DB introspection (great for learning / demos)
router.get('/', (_req, res, next) => {
  try {
    const tables = db.schema.tables().map(t => t.name);
    const schema = {};
    tables.forEach(t => { schema[t] = db.schema.describe(t); });
    res.json({
      success: true,
      status:  200,
      stats:   db.schema.stats(),
      tables,
      schema,
      relationships: [
        'users (1) ──── (M) recipes   [user_id FK → users.id, CASCADE DELETE]',
        'recipes (M) ── (M) tags      [via recipe_tags junction table]',
      ],
    });
  } catch (e) { next(e); }
});

module.exports = router;
