const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { validateUser }  = require('../utils/validate');
const { createError }   = require('../middleware/errorHandler');

router.get('/', (_req, res, next) => {
  try {
    res.json({ success: true, status: 200, data: db.users.findAll() });
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const id   = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(createError(400, 'id must be an integer.'));
    const user = db.users.findById(id);
    if (!user) return next(createError(404, `User ${id} not found.`));
    res.json({ success: true, status: 200, data: user });
  } catch (e) { next(e); }
});

// GET /api/users/:id/recipes — one-to-many relationship demo
router.get('/:id/recipes', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(createError(400, 'id must be an integer.'));
    if (!db.users.findById(id)) return next(createError(404, `User ${id} not found.`));
    const recipes = db.recipes.findAll({ user_id: id });
    res.json({ success: true, status: 200, count: recipes.length, data: recipes });
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const { valid, errors } = validateUser(req.body);
    if (!valid) return next(createError(400, 'Validation failed.', errors));
    const { name, email, password } = req.body;
    const user = db.users.create({ name, email, password }); // throws 409 on duplicate
    res.status(201).json({ success: true, status: 201, message: 'User created.', data: user });
  } catch (e) {
    if (e.status) return next(e);
    next(e);
  }
});

module.exports = router;
