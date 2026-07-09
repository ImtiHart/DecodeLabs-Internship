/**
 * Centralised error-handling middleware.
 *
 * All routes call next(err) or next(createError(code, msg)) to reach here,
 * ensuring every error response has the same JSON shape.
 *
 * Response envelope:
 * {
 *   "success": false,
 *   "status":  <HTTP status code>,
 *   "message": <human-readable string>,
 *   "errors":  <array — present on validation failures>
 * }
 */

// ── 404 catcher (must be placed AFTER all routes) ────────────────────────────
function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';

  // Log server errors to console (5xx)
  if (status >= 500) {
    console.error('[500]', err.stack || err.message);
  }

  res.status(status).json({
    success: false,
    status,
    message,
    ...(err.errors && { errors: err.errors }),
  });
}

// ── Helper: create an error with status + optional validation errors array ────
function createError(status, message, errors = null) {
  const err = new Error(message);
  err.status = status;
  if (errors) err.errors = errors;
  return err;
}

module.exports = { notFound, errorHandler, createError };
