// src/routes/api/index.js
/**
 * The main entry-point for the v1 version of the fragments API.
 */
const express = require('express');
const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const { authenticate } = require('../../auth');

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

// POST /v1/fragments (authenticate first, then raw body -> Buffer, then handler)
router.post('/fragments', authenticate(), rawBody(), require('./post'));

// GET /v1/fragments
router.get('/fragments', authenticate(), require('./get'));

module.exports = router;
