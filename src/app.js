// src/app.js (Express app)

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const pino = require('pino-http');

const logger = require('./logger');
const { author, version } = require('../package.json');

const passport = require('passport');
const auth = require('./auth');

const app = express();

// Logging first
app.use(pino({ logger }));

// Security + compression
app.use(helmet());
app.use(
  cors({
    origin: 'http://localhost:1234',
    credentials: true,
  })
);
app.use(compression());

// Register passport strategy if provided by the auth impl
if (typeof auth.strategy === 'function') {
  passport.use(auth.strategy());
}
app.use(passport.initialize());

// Health check
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    author,
    githubUrl: 'https://github.com/your/repo', // TODO update
    version,
  });
});

// Mount versioned routes
app.use('/', require('./routes'));

// 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: {
      message: 'not found',
      code: 404,
    },
  });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'unable to process request';
  if (status >= 500) {
    logger.error({ err }, 'Error processing request');
  }
  res.status(status).json({
    status: 'error',
    error: { message, code: status },
  });
});

module.exports = app;
