/**
 * /api/users  — User resource
 *
 * GET  /api/users       → list all users  (passwords never returned)
 * POST /api/users       → register a new user
 * GET  /api/users/:id   → get one user
 */

const express = require('express');
const router  = express.Router();
const db      = require('../data/store');
const { validateUser } = require('../utils/validate');
const { createError }  = require('../middleware/errorHandler');

// ── GET /api/users ────────────────────────────────────────────────────────────
router.get('/', (_req, res) => {
  const users = db.users.findAll();
  res.json({ success: true, status: 200, count: users.length, data: users });
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
router.get('/:id', (req, res, next) => {
  const id   = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) return next(createError(400, 'User id must be a positive integer.'));

  const user = db.users.findById(id);
  if (!user) return next(createError(404, `User with id ${id} not found.`));

  res.json({ success: true, status: 200, data: user });
});

// ── POST /api/users ───────────────────────────────────────────────────────────
router.post('/', (req, res, next) => {
  const { valid, errors } = validateUser(req.body);
  if (!valid) return next(createError(400, 'Validation failed.', errors));

  const { name, email, password } = req.body;

  // Semantic check: duplicate email
  if (db.users.findByEmail(email)) {
    return next(createError(409, 'An account with that email already exists.'));
  }

  // NOTE: In production, hash the password (bcrypt). Storing plaintext here
  // only because this project has no auth/session layer yet (Project 3+).
  const user = db.users.create({ name: name.trim(), email: email.toLowerCase(), password });

  res.status(201).json({
    success: true,
    status:  201,
    message: 'User created successfully.',
    data:    user,   // password stripped by db.users.create
  });
});

module.exports = router;
