const express = require('express');
const router  = express.Router();

/**
 * GET /api/health
 * Simple liveness probe — returns 200 when the server is up.
 */
router.get('/', (_req, res) => {
  res.json({
    success:   true,
    status:    200,
    message:   'API is healthy',
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

module.exports = router;
