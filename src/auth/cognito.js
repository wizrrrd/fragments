// src/auth/cognito.js
// Example outline — keep your current Bearer strategy setup as-is.
// If you already have a Bearer strategy defined, leave it; only the
// authenticate() export changes to use authorize('bearer').

const logger = require('../logger');

// ✅ NEW: use our custom authorize middleware
const authorize = require('./auth-middleware');

// (Keep your existing strategy code. For example:)
// const { Strategy: BearerStrategy } = require('passport-http-bearer');
// module.exports.strategy = () =>
//   new BearerStrategy(async (token, done) => {
//     try {
//       // verify token with Cognito/JWKS...
//       // call done(null, emailString) on success, or done(null, false) if invalid
//     } catch (err) {
//       return done(err);
//     }
//   });

/**
 * ✅ CHANGED:
 * Previously:
 *   module.exports.authenticate = () => passport.authenticate('bearer', { session: false });
 * Now we delegate to our custom authorize middleware.
 */
module.exports.authenticate = () => {
  logger.info('Using Cognito Bearer auth');
  return authorize('bearer');
};
