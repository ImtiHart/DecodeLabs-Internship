const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { createError } = require('../middleware/errorHandler');

// GET /api/tags
router.get('/', (_req, res, next) => {
  try { res.json({ success: true, status: 200, data: db.tags.findAll() }); }
  catch (e) { next(e); }
});

// POST /api/tags  { name: string }
router.post('/', (req, res, next) => {
  try {
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim().length < 1)
      return next(createError(400, '`name` is required.'));
    const tag = db.tags.create(req.body.name);
    res.status(201).json({ success: true, status: 201, data: tag });
  } catch (e) {
    if (e.status) return next(e);
    next(e);
  }
});

module.exports = router;
