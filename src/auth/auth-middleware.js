// src/auth/auth-middleware.js
//
// Wraps passport.authenticate() so we can (a) normalize errors,
// (b) hash the user email, and (c) attach { id: <hash> } to req.user.

const passport = require('passport');
const { createErrorResponse } = require('../response');
const hash = require('../hash');
const logger = require('../logger');

/**
 * @param {'bearer'|'http'} strategyName
 * @returns Express middleware
 */
module.exports = (strategyName) => (req, res, next) => {
  function callback(err, email) {
    if (err) {
      logger.error({ err }, 'error authenticating user');
      return res.status(500).json(createErrorResponse(500, 'Unable to authenticate user'));
    }

    if (!email) {
      logger.warn('unauthorized request');
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    // Hash the email and attach as req.user.id to keep the rest of the app happy
    const ownerId = hash(email);
    req.user = { id: ownerId };

    logger.debug({ email, ownerId }, 'authenticated user');
    next();
  }

  return passport.authenticate(strategyName, { session: false }, callback)(req, res, next);
};
