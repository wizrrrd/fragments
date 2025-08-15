// src/auth/cognito.js
//
// Keep your existing Bearer strategy implementation here (verifies
// the Cognito JWT and calls `done(null, email)` on success).
// This file only changes how `authenticate()` is exported so that we
// run our custom middleware which hashes the email and sets req.user.id.

const logger = require('../logger');
const authorize = require('./auth-middleware');

// ⬇️ IMPORTANT: DO NOT remove your existing `module.exports.strategy = () => ...`
// Bearer strategy code. The app still needs to register it with passport.
// Example:
// const { Strategy: BearerStrategy } = require('passport-http-bearer');
// module.exports.strategy = () => new BearerStrategy(async (token, done) => { /* verify */ });

module.exports.authenticate = () => {
  logger.info('Using Cognito Bearer auth');
  return authorize('bearer');
};
