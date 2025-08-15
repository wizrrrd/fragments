// src/auth/auth-middleware.js
//
// Wraps passport.authenticate() so we can (a) normalize errors,
// (b) hash the user email, and (c) attach { id: <hash> } to req.user.

const passport = require('passport');
const { createErrorResponse } = require('../response');
const hash = require('../hash');
const logger = require('../logger');

/**
 * Resolve a strategy name if the caller didn't provide one.
 * We prefer 'bearer' if registered, otherwise 'http'.
 */
function resolveStrategyName(explicit) {
  if (explicit) return explicit;
  const strategies = passport._strategies || {};
  if (strategies.bearer) return 'bearer';
  if (strategies.http) return 'http';
  return null;
}

/**
 * @param {'bearer'|'http'} [strategyName]
 * @returns Express middleware
 */
module.exports = (strategyName) => (req, res, next) => {
  const name = resolveStrategyName(strategyName);
  if (!name) {
    logger.error('No auth strategy registered on passport');
    return res.status(500).json(createErrorResponse(500, 'Unable to authenticate user'));
  }

  function callback(err, principal) {
    if (err) {
      logger.error({ err }, 'error authenticating user');
      return res.status(500).json(createErrorResponse(500, 'Unable to authenticate user'));
    }

    if (!principal) {
      logger.warn('unauthorized request');
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    // Hash the email/username and attach as req.user.id to keep the rest of the app happy
    const ownerId = hash(principal);
    req.user = { id: ownerId };

    logger.debug({ principal, ownerId }, 'authenticated user');
    next();
  }

  return passport.authenticate(name, { session: false }, callback)(req, res, next);
};
