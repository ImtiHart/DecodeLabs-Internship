/**
 * /api/recipes  — RESTful resource
 *
 * GET    /api/recipes          → list all  (supports ?category= and ?level= filters)
 * POST   /api/recipes          → create one
 * GET    /api/recipes/:id      → get one
 * PUT    /api/recipes/:id      → update one (full or partial)
 * DELETE /api/recipes/:id      → delete one
 */

const express = require('express');
const router  = express.Router();
const db      = require('../data/store');
const { validateRecipe, validateRecipeUpdate, ALLOWED_CATEGORIES } = require('../utils/validate');
const { createError } = require('../middleware/errorHandler');

// ── Helper: parse & validate integer id param ────────────────────────────────
function parseId(param, next) {
  const id = parseInt(param, 10);
  if (isNaN(id) || id <= 0) {
    next(createError(400, 'Recipe id must be a positive integer.'));
    return null;
  }
  return id;
}

// ── GET /api/recipes ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  let recipes = db.recipes.findAll();

  // Optional query filters
  if (req.query.category) {
    recipes = recipes.filter(r => r.category === req.query.category);
  }
  if (req.query.level) {
    recipes = recipes.filter(r => r.level === req.query.level);
  }

  res.json({
    success: true,
    status:  200,
    count:   recipes.length,
    filters: { ...(req.query.category && { category: req.query.category }),
               ...(req.query.level    && { level:    req.query.level    }) },
    data:    recipes,
    meta: {
      allowed_categories: ALLOWED_CATEGORIES,
      tip: 'Filter with ?category=Mains or ?level=Easy',
    },
  });
});

// ── GET /api/recipes/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res, next) => {
  const id = parseId(req.params.id, next);
  if (id === null) return;

  const recipe = db.recipes.findById(id);
  if (!recipe) return next(createError(404, `Recipe with id ${id} not found.`));

  res.json({ success: true, status: 200, data: recipe });
});

// ── POST /api/recipes ─────────────────────────────────────────────────────────
router.post('/', (req, res, next) => {
  // Layer 1 + 2 validation
  const { valid, errors } = validateRecipe(req.body);
  if (!valid) return next(createError(400, 'Validation failed.', errors));

  const { title, category, ingredients, steps, time_mins, serves, level } = req.body;
  const recipe = db.recipes.create({
    title:       title.trim(),
    category,
    ingredients,
    steps,
    time_mins:   time_mins ?? null,
    serves:      serves    ?? null,
    level:       level     ?? 'Easy',
  });

  // 201 Created — new resource
  res.status(201).json({
    success: true,
    status:  201,
    message: 'Recipe created successfully.',
    data:    recipe,
  });
});

// ── PUT /api/recipes/:id ──────────────────────────────────────────────────────
router.put('/:id', (req, res, next) => {
  const id = parseId(req.params.id, next);
  if (id === null) return;

  if (!db.recipes.findById(id)) return next(createError(404, `Recipe with id ${id} not found.`));

  const { valid, errors } = validateRecipeUpdate(req.body);
  if (!valid) return next(createError(400, 'Validation failed.', errors));

  // Guard: reject unknown fields
  const ALLOWED_FIELDS = ['title', 'category', 'ingredients', 'steps', 'time_mins', 'serves', 'level'];
  const unknown = Object.keys(req.body).filter(k => !ALLOWED_FIELDS.includes(k));
  if (unknown.length) {
    return next(createError(400, `Unknown fields: ${unknown.join(', ')}.`));
  }

  const updated = db.recipes.update(id, req.body);
  res.json({
    success: true,
    status:  200,
    message: 'Recipe updated successfully.',
    data:    updated,
  });
});

// ── DELETE /api/recipes/:id ───────────────────────────────────────────────────
router.delete('/:id', (req, res, next) => {
  const id = parseId(req.params.id, next);
  if (id === null) return;

  const deleted = db.recipes.remove(id);
  if (!deleted) return next(createError(404, `Recipe with id ${id} not found.`));

  // 204 No Content — successful deletion, no body needed
  res.status(204).send();
});

module.exports = router;
