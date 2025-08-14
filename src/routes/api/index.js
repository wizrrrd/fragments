// src/routes/api/index.js
const express = require('express');
const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

const router = express.Router();

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

router.post('/fragments', rawBody(), require('./post'));
router.get('/fragments', require('./get'));

module.exports = router;
