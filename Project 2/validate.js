/**
 * Validation utilities.
 *
 * Each function returns { valid: bool, errors: string[] }.
 * Following the "Gatekeeper Rule" from the slides:
 *   Layer 1 — Syntactic validation (is the format correct?)
 *   Layer 2 — Semantic validation  (is the logic valid?)
 */

const ALLOWED_CATEGORIES = ['Soups & Stews', 'Baking', 'Salads', 'Mains', 'Desserts'];
const ALLOWED_LEVELS      = ['Easy', 'Medium', 'Hard'];
const EMAIL_RE            = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Recipe ───────────────────────────────────────────────────────────────────
function validateRecipe(body) {
  const errors = [];

  // Syntactic — required fields present and correct type
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 3) {
    errors.push('`title` is required and must be at least 3 characters.');
  }
  if (!body.category) {
    errors.push('`category` is required.');
  }
  if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    errors.push('`ingredients` must be a non-empty array.');
  }
  if (!Array.isArray(body.steps) || body.steps.length === 0) {
    errors.push('`steps` must be a non-empty array.');
  }
  if (body.time_mins !== undefined && (!Number.isInteger(body.time_mins) || body.time_mins <= 0)) {
    errors.push('`time_mins` must be a positive integer.');
  }
  if (body.serves !== undefined && (!Number.isInteger(body.serves) || body.serves <= 0)) {
    errors.push('`serves` must be a positive integer.');
  }

  // Semantic — values make sense
  if (body.category && !ALLOWED_CATEGORIES.includes(body.category)) {
    errors.push(`\`category\` must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`);
  }
  if (body.level && !ALLOWED_LEVELS.includes(body.level)) {
    errors.push(`\`level\` must be one of: ${ALLOWED_LEVELS.join(', ')}.`);
  }

  return { valid: errors.length === 0, errors };
}

// ── Partial Recipe (for PUT — allow missing optional fields) ─────────────────
function validateRecipeUpdate(body) {
  const errors = [];

  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length < 3)) {
    errors.push('`title` must be at least 3 characters.');
  }
  if (body.category !== undefined && !ALLOWED_CATEGORIES.includes(body.category)) {
    errors.push(`\`category\` must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`);
  }
  if (body.ingredients !== undefined && (!Array.isArray(body.ingredients) || body.ingredients.length === 0)) {
    errors.push('`ingredients` must be a non-empty array.');
  }
  if (body.steps !== undefined && (!Array.isArray(body.steps) || body.steps.length === 0)) {
    errors.push('`steps` must be a non-empty array.');
  }
  if (body.time_mins !== undefined && (!Number.isInteger(body.time_mins) || body.time_mins <= 0)) {
    errors.push('`time_mins` must be a positive integer.');
  }
  if (body.level !== undefined && !ALLOWED_LEVELS.includes(body.level)) {
    errors.push(`\`level\` must be one of: ${ALLOWED_LEVELS.join(', ')}.`);
  }

  return { valid: errors.length === 0, errors };
}

// ── User ─────────────────────────────────────────────────────────────────────
function validateUser(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.push('`name` is required and must be at least 2 characters.');
  }
  if (!body.email || !EMAIL_RE.test(body.email)) {
    errors.push('`email` must be a valid email address.');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
    errors.push('`password` is required and must be at least 8 characters.');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateRecipe, validateRecipeUpdate, validateUser, ALLOWED_CATEGORIES };
