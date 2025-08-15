// src/auth/basic-auth.js
//
// Configure HTTP Basic Auth strategy for Passport, see:
// https://github.com/http-auth/http-auth-passport

const auth = require('http-auth');
const authPassport = require('http-auth-passport');
const logger = require('../logger');

// We'll use our authorize middleware to hash email + set req.user.id
const authorize = require('./auth-middleware');

// We expect HTPASSWD_FILE to be defined.
if (!process.env.HTPASSWD_FILE) {
  throw new Error('missing expected env var: HTPASSWD_FILE');
}

// Log that we're using Basic Auth
logger.info('Using HTTP Basic Auth for auth');

module.exports.strategy = () =>
  // Passport strategy: look for Basic credentials in Authorization header
  authPassport(
    auth.basic({
      file: process.env.HTPASSWD_FILE,
    })
  );

// Delegate to our custom authorize middleware
module.exports.authenticate = () => authorize('http');
