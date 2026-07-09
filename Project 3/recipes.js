/**
 * routes/recipes.js
 * Full CRUD — now reading/writing SQLite through the db layer.
 * Pillar 3: every route maps  HTTP method ↔ CRUD ↔ SQL verb
 *   POST   → CREATE → INSERT
 *   GET    → READ   → SELECT
 *   PUT    → UPDATE → UPDATE
 *   DELETE → DELETE → DELETE
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { validateRecipe, validateRecipeUpdate, ALLOWED_CATEGORIES } = require('../utils/validate');
const { createError } = require('../middleware/errorHandler');

function parseId(param, next) {
  const id = parseInt(param, 10);
  if (isNaN(id) || id <= 0) { next(createError(400, 'id must be a positive integer.')); return null; }
  return id;
}

// GET /api/recipes  (+ optional ?category=  ?level=  ?user_id= filters)
router.get('/', (req, res, next) => {
  try {
    const { category, level, user_id } = req.query;
    const recipes = db.recipes.findAll({
      category,
      level,
      user_id: user_id ? parseInt(user_id, 10) : undefined,
    });
    res.json({
      success: true, status: 200,
      count: recipes.length,
      filters: { ...(category && { category }), ...(level && { level }) },
      data: recipes,
      meta: { allowed_categories: ALLOWED_CATEGORIES },
    });
  } catch (e) { next(e); }
});

// GET /api/recipes/:id
router.get('/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id, next);
    if (id === null) return;
    const recipe = db.recipes.findById(id);
    if (!recipe) return next(createError(404, `Recipe ${id} not found.`));
    res.json({ success: true, status: 200, data: recipe });
  } catch (e) { next(e); }
});

// POST /api/recipes
router.post('/', (req, res, next) => {
  try {
    const { valid, errors } = validateRecipe(req.body);
    if (!valid) return next(createError(400, 'Validation failed.', errors));

    // default author = user 1 (Ada); in Project 4 this comes from the JWT session
    const user_id = req.body.user_id ?? 1;
    if (!db.users.findById(user_id)) return next(createError(404, `User ${user_id} not found.`));

    const { title, category, ingredients, steps, time_mins, serves, level } = req.body;
    const recipe = db.recipes.create({ user_id, title, category, ingredients, steps, time_mins, serves, level });
    res.status(201).json({ success: true, status: 201, message: 'Recipe created.', data: recipe });
  } catch (e) { next(e); }
});

// PUT /api/recipes/:id
router.put('/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id, next);
    if (id === null) return;
    if (!db.recipes.findById(id)) return next(createError(404, `Recipe ${id} not found.`));

    const { valid, errors } = validateRecipeUpdate(req.body);
    if (!valid) return next(createError(400, 'Validation failed.', errors));

    const updated = db.recipes.update(id, req.body);
    res.json({ success: true, status: 200, message: 'Recipe updated.', data: updated });
  } catch (e) { next(e); }
});

// DELETE /api/recipes/:id
router.delete('/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id, next);
    if (id === null) return;
    const deleted = db.recipes.remove(id);
    if (!deleted) return next(createError(404, `Recipe ${id} not found.`));
    res.status(204).send();
  } catch (e) { next(e); }
});

// ── Tags sub-resource ─────────────────────────────────────────────────────────

// POST /api/recipes/:id/tags  { tag_id: number }
router.post('/:id/tags', (req, res, next) => {
  try {
    const recipeId = parseId(req.params.id, next);
    if (recipeId === null) return;
    if (!db.recipes.findById(recipeId)) return next(createError(404, `Recipe ${recipeId} not found.`));

    const tagId = parseInt(req.body.tag_id, 10);
    if (!tagId || tagId <= 0) return next(createError(400, '`tag_id` must be a positive integer.'));
    if (!db.tags.findById(tagId)) return next(createError(404, `Tag ${tagId} not found.`));

    db.tags.addToRecipe(recipeId, tagId);
    const recipe = db.recipes.findById(recipeId);
    res.json({ success: true, status: 200, message: 'Tag added.', data: recipe });
  } catch (e) { next(e); }
});

// DELETE /api/recipes/:id/tags/:tag_id
router.delete('/:id/tags/:tag_id', (req, res, next) => {
  try {
    const recipeId = parseId(req.params.id, next);
    if (recipeId === null) return;
    const tagId = parseId(req.params.tag_id, next);
    if (tagId === null) return;
    const removed = db.tags.removeFromRecipe(recipeId, tagId);
    if (!removed) return next(createError(404, 'Tag not linked to this recipe.'));
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
