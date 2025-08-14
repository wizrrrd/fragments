// src/routes/index.js
const express = require('express');
const { version, author } = require('../../package.json');
const router = express.Router();

const { authenticate } = require('../auth');

// Protect everything under /v1 with Basic Auth
router.use('/v1', authenticate(), require('./api'));

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    author,
    githubUrl: 'https://github.com/wizrrrd/fragments.git',
    version,
  });
});

module.exports = router;
