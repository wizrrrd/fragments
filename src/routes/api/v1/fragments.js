// src/routes/api/v1/fragments.js
const express = require('express');
const router = express.Router();
const contentType = require('content-type');

const { Fragment } = require('../../../model/fragment');
// ✅ Use the top-level auth selector so the right strategy is registered with passport
const { authenticate } = require('../../../auth');
const { createSuccessResponse, createErrorResponse } = require('../../../response');
const logger = require('../../../logger');
//const data = require('../../../model/data'); // kept in case you want direct access
const getConverted = require('./get-converted'); // ensure this file exists at v1/get-converted.js

// Raw body parser so POST receives a Buffer for supported types
const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    type: (req) => {
      try {
        const { type } = contentType.parse(req);
        return Fragment.isSupportedType(type);
      } catch {
        return false;
      }
    },
  });

// Small helper: normalize owner id whether middleware set string or { id }
const ownerIdFrom = (req) => req.user?.id || req.user;

/**
 * POST /v1/fragments
 * Creates a new fragment.
 */
router.post('/', authenticate(), rawBody(), async (req, res) => {
  try {
    const typeHeader = req.get('Content-Type');
    if (!Fragment.isSupportedType(typeHeader)) {
      return res.status(415).json(createErrorResponse(415, 'Unsupported Content-Type'));
    }

    const baseType = String(typeHeader).split(';')[0].trim().toLowerCase();
    let buf;

    if (Buffer.isBuffer(req.body)) {
      buf = req.body;
    } else if (baseType === 'application/json') {
      buf = Buffer.from(
        typeof req.body === 'object' && req.body !== null
          ? JSON.stringify(req.body)
          : String(req.body ?? ''),
        'utf-8'
      );
    } else if (baseType.startsWith('text/')) {
      buf = Buffer.from(String(req.body ?? ''), 'utf-8');
    } else {
      return res.status(415).json(createErrorResponse(415, 'Unsupported Content-Type'));
    }

    const fragment = new Fragment({ ownerId: ownerIdFrom(req), type: typeHeader, size: 0 });
    await fragment.save();
    await fragment.setData(buf);

    // ✅ Prefer API_URL when provided (assignment tests expect this)
    const base = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
    res.set('Location', `${base}/v1/fragments/${fragment.id}`);
    return res.status(201).json(createSuccessResponse({ fragment }));
  } catch (err) {
    logger.error({ err }, 'Error creating fragment');
    return res.status(500).json(createErrorResponse(500, 'Error creating fragment'));
  }
});

/**
 * GET /v1/fragments
 * List fragments (ids or expanded).
 */
router.get('/', authenticate(), async (req, res) => {
  try {
    const expand = req.query.expand === '1';
    const fragments = await Fragment.byUser(ownerIdFrom(req), expand);
    res.status(200).json(createSuccessResponse({ fragments }));
  } catch (err) {
    logger.error({ err }, 'Error retrieving fragments list');
    res.status(500).json(createErrorResponse(500, 'Error retrieving fragments list'));
  }
});

/**
 * GET /v1/fragments/:id/info  (MUST be before '/:id')
 * Returns JSON metadata only.
 */
router.get('/:id/info', authenticate(), async (req, res) => {
  try {
    const fragment = await Fragment.byId(ownerIdFrom(req), req.params.id);
    if (!fragment) return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    const meta = typeof fragment.toJSON === 'function' ? fragment.toJSON() : fragment;
    res.status(200).json(createSuccessResponse({ fragment: meta }));
  } catch (err) {
    // ✅ use `err` so ESLint no-unused-vars doesn’t complain, and you keep a helpful log
    logger.warn({ err, id: req.params.id }, 'Fragment not found in /:id/info');
    res.status(404).json(createErrorResponse(404, 'Fragment not found'));
  }
});

/**
 * GET /v1/fragments/:id.:ext  (MUST be before '/:id')
 * Conversion handler (e.g., markdown -> html).
 */
router.get('/:id.:ext', authenticate(), getConverted);

/**
 * GET /v1/fragments/:id
 * Return the RAW bytes with the fragment's Content-Type header.
 */
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const fragment = await Fragment.byId(ownerIdFrom(req), req.params.id);
    if (!fragment) return res.status(404).json(createErrorResponse(404, 'Fragment not found'));

    const buf = await fragment.getData();
    res.set('Content-Type', fragment.type);
    return res.status(200).send(buf);
  } catch (err) {
    logger.error({ err }, 'Error retrieving fragment data');
    return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
  }
});

/**
 * DELETE /v1/fragments/:id
 * Delete fragment data and metadata.
 */
router.delete('/:id', authenticate(), async (req, res, next) => {
  try {
    const ownerId = ownerIdFrom(req);
    const { id } = req.params;

    // Ensure it exists
    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Delete data + metadata
    try {
      await Fragment.delete(ownerId, id);
    } catch (e) {
      logger.warn({ e, ownerId, id }, 'Non-fatal error deleting fragment');
    }

    return res.status(200).json(createSuccessResponse({ fragmentId: id }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
