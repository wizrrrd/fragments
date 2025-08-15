// src/auth/basic-auth.js
//
// Configure HTTP Basic Auth strategy for Passport, see:
// https://github.com/http-auth/http-auth-passport
//
// This implementation supports two modes:
//  1) File-backed using HTPASSWD_FILE (bcrypt/htpasswd format)
//  2) Inline test creds via env: BASIC_USER_<N>_EMAIL / BASIC_USER_<N>_PASSWORD
//
// In unit tests we typically don't mount a real .htpasswd, so the inline
// mode lets the tests pass with BASIC_USER_1_EMAIL/password vars.

const auth = require('http-auth');
const authPassport = require('http-auth-passport');
const logger = require('../logger');

// We'll use our authorize middleware to hash email + set req.user.id
const authorize = require('./auth-middleware');

// Gather inline users from env: BASIC_USER_1_EMAIL / BASIC_USER_1_PASSWORD,
// BASIC_USER_2_EMAIL / BASIC_USER_2_PASSWORD, etc.
function getInlineUsersFromEnv() {
  const users = [];
  // Look for all env pairs BASIC_USER_<N>_EMAIL and BASIC_USER_<N>_PASSWORD
  Object.keys(process.env)
    .filter((k) => /^BASIC_USER_\d+_EMAIL$/.test(k))
    .forEach((emailKey) => {
      const n = emailKey.match(/^BASIC_USER_(\d+)_EMAIL$/)[1];
      const passKey = `BASIC_USER_${n}_PASSWORD`;
      if (process.env[passKey]) {
        users.push({
          email: process.env[emailKey],
          password: process.env[passKey],
        });
      }
    });
  return users;
}

const hasHtpasswd = !!process.env.HTPASSWD_FILE && process.env.NODE_ENV !== 'production';
const inlineUsers = getInlineUsersFromEnv();
const hasInline = inlineUsers.length > 0;

// Decide which mode to use
let basic;
if (hasHtpasswd) {
  // File-backed mode (for local/dev runtime or Docker)
  logger.info('Auth: using HTTP Basic with HTPASSWD_FILE');
  basic = auth.basic({
    // http-auth expects the file path here
    file: process.env.HTPASSWD_FILE,
  });
} else if (hasInline) {
  // Inline test users mode (for Jest/unit tests)
  logger.info('Auth: using HTTP Basic with inline test users from env');
  basic = auth.basic({ realm: 'fragments' }, (username, password, cb) => {
    const ok = inlineUsers.some((u) => u.email === username && u.password === password);
    cb(ok);
  });
} else {
  // Neither mode provided; make this obvious if someone wires it up by accident
  logger.warn('Auth: basic-auth selected, but neither HTPASSWD_FILE nor inline BASIC_USER creds are set');
  // Create a basic realm that always fails
  basic = auth.basic({ realm: 'fragments' }, (_u, _p, cb) => cb(false));
}

// Passport strategy: look for Basic credentials in Authorization header
module.exports.strategy = () => authPassport(basic);

// Delegate to our custom authorize middleware (uses the "http" strategy name)
module.exports.authenticate = () => authorize('http');
