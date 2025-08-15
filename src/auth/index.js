// src/auth/index.js
//
// Central auth selector. Chooses between Amazon Cognito (bearer) and
// HTTP Basic Auth based on env. Re-exports both `strategy()` (if the
// implementation provides it) and the route-level `authenticate()`
// middleware used by your routes.

const logger = require('../logger');

const hasCognito = !!(process.env.AWS_COGNITO_POOL_ID && process.env.AWS_COGNITO_CLIENT_ID);
const hasBasic   = !!process.env.HTPASSWD_FILE && process.env.NODE_ENV !== 'production';

// Allow explicit override
const forced = (process.env.AUTH_STRATEGY || '').toLowerCase();
const useBearer = forced ? forced === 'bearer' : hasCognito;
const useBasic  = forced ? forced === 'basic'  : (!hasCognito && hasBasic);

if (useBearer && useBasic) {
  throw new Error('Auth misconfigured: both Cognito(bearer) and Basic are enabled. Choose one.');
}
if (!useBearer && !useBasic) {
  throw new Error('Auth misconfigured: no authorization configuration found.');
}

const impl = useBearer ? require('./cognito') : require('./basic-auth');

logger.info(`Auth: using ${useBearer ? 'Amazon Cognito (bearer tokens)' : 'HTTP Basic Auth'}`);

// Re-export the route middleware
module.exports.authenticate = impl.authenticate;

// Optionally expose the strategy() so app.js can register with passport when needed
if (typeof impl.strategy === 'function') {
  module.exports.strategy = impl.strategy;
}
