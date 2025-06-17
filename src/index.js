// src/index.js

// Only load .env for dev/prod, not during tests (tests use env.jest)
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}

// We want to log any crash cases so we can debug later from logs.
const logger = require('./logger');

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err, origin }, 'uncaughtException');
  throw err;
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'unhandledRejection');
  throw reason;
});

// Start our server (which uses app.js)
require('./server');
