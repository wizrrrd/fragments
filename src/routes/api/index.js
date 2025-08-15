// src/routes/api/index.js
/**
 * The main entry-point for the v1 version of the fragments API.
 */
const express = require('express');
const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { authenticate } = require('../../auth');
const hash = require('../../hash'); // needed to derive owner id for Basic Auth

const router = express.Router();

// Support sending various Content-Types on the body up to 5M in size
const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    type: (req) => {
      try {
        const { type } = contentType.parse(req);
        return Fragment.isSupportedType(type);
      } catch (err) {
        logger.warn({ err, ct: req.headers['content-type'] }, 'rawBody: invalid Content-Type');
        return false;
      }
    },
  });

/**
 * Helper: derive the owner id consistently for both Basic and Bearer auth cases.
 * - Basic commonly gives an email → hash it
 * - Some bearer flows may already give a hashed id on req.user.id
 */
function ownerIdFrom(req) {
  const u = req.user?.id || req.user?.email || req.user;
  if (!u) return undefined;
  return /@/.test(u) ? hash(u) : u;
}

// POST /v1/fragments (authenticate first, then raw body -> Buffer, then handler)
router.post('/fragments', authenticate(), rawBody(), require('./post'));

// GET /v1/fragments
router.get('/fragments', authenticate(), require('./get'));

// ---------------------------------------------------------------------------
// Additional Assignment 2 routes
// ---------------------------------------------------------------------------

// GET /v1/health  (simple health endpoint; authenticated since /v1 is protected)
router.get('/health', authenticate(), require('./get-health'));

// GET /v1/fragments/:id/info  -> return fragment metadata only
router.get('/fragments/:id/info', authenticate(), async (req, res) => {
  try {
    const ownerId = ownerIdFrom(req);
    const id = req.params.id;

    const fragment = await Fragment.byId(ownerId, id);
    return res.status(200).json({ status: 'ok', fragment: fragment.toJSON() });
  } catch (err) {
    // Translate “not found” to 404; everything else 500
    if ((err && err.message) === 'fragment not found') {
      return res.status(404).json({ status: 'error', error: { message: 'not found', code: 404 } });
    }
    logger.error({ err }, 'error in GET /v1/fragments/:id/info');
    return res
      .status(500)
      .json({ status: 'error', error: { message: err.message || 'unable to process request', code: 500 } });
  }
});

// ---------------------------------------------------------------------------
// IMPORTANT: order matters — put the *conversion* route BEFORE raw :id
// ---------------------------------------------------------------------------

// GET /v1/fragments/:id.:ext   -> conversion handler (e.g., markdown -> html)
router.get('/fragments/:id.:ext', authenticate(), require('./get-converted'));

// GET /v1/fragments/:id        -> return raw data with correct Content-Type
router.get('/fragments/:id', authenticate(), async (req, res) => {
  try {
    // If the route with extension matches, Express won't come here; this is raw by-id
    const ownerId = ownerIdFrom(req);
    const id = req.params.id;

    const fragment = await Fragment.byId(ownerId, id);
    const data = await fragment.getData();
    const type = fragment.type || fragment.mimeType || 'application/octet-stream';
    res.set('Content-Type', type);
    return res.status(200).send(data);
  } catch (err) {
    if ((err && err.message) === 'fragment not found') {
      return res.status(404).json({ status: 'error', error: { message: 'not found', code: 404 } });
    }
    logger.error({ err }, 'error in GET /v1/fragments/:id');
    return res
      .status(500)
      .json({ status: 'error', error: { message: err.message || 'unable to process request', code: 500 } });
  }
});

module.exports = router;
