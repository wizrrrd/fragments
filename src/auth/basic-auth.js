//src/auth/basic-auth.js
// Configure HTTP Basic Auth strategy for Passport, see:
// https://github.com/http-auth/http-auth-passport

const auth = require('http-auth');
const authPassport = require('http-auth-passport');
const logger = require('../logger');

// ✅ NEW: use our custom authorize middleware (wraps passport.authenticate)
const authorize = require('./auth-middleware');

// We expect HTPASSWD_FILE to be defined.
if (!process.env.HTPASSWD_FILE) {
  throw new Error('missing expected env var: HTPASSWD_FILE');
}

// Log that we're using Basic Auth
logger.info('Using HTTP Basic Auth for auth');

/**
 * Strategy factory for Passport.
 * We still export a strategy() so app.js can call:
 *   passport.use(basic.strategy())
 * This part doesn't change.
 */
module.exports.strategy = () =>
  authPassport(
    auth.basic({
      file: process.env.HTPASSWD_FILE,
    })
  );

/**
 * ✅ CHANGED:
 * Previously:
 *   module.exports.authenticate = () => passport.authenticate('http', { session: false });
 * Now we delegate to our custom authorize middleware so we can hash the email,
 * standardize error handling, and add consistent logging.
 */
module.exports.authenticate = () => authorize('http');
