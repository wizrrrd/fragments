// src/auth/index.js
//
// Central auth selector. Chooses between Amazon Cognito (bearer) and
// HTTP Basic Auth based on env. Re-exports both `strategy()` (if the
// implementation provides it) and the route-level `authenticate()`
// middleware used by your routes.

const logger = require('../logger');
const passport = require('passport');

const hasCognito =
  !!(process.env.AWS_COGNITO_POOL_ID && process.env.AWS_COGNITO_CLIENT_ID);

// Basic can come from either an htpasswd file (runtime) or inline test creds (unit tests)
const hasBasicFile = !!process.env.HTPASSWD_FILE && process.env.NODE_ENV !== 'production';
const hasBasicInline =
  !!process.env.BASIC_USER_1_EMAIL && !!process.env.BASIC_USER_1_PASSWORD;

// Allow explicit override
const forced = (process.env.AUTH_STRATEGY || '').toLowerCase();
const useBearer = forced ? (forced === 'bearer' || forced === 'cognito') : hasCognito;
const useBasic  = forced ? (forced === 'basic') : (!useBearer && (hasBasicFile || hasBasicInline));

if (useBearer && useBasic) {
  throw new Error('Auth misconfigured: both Cognito(bearer) and Basic are enabled. Choose one.');
}

if (!useBearer && !useBasic) {
  // IMPORTANT: do not throw in test/dev; export a predictable 401 middleware instead.
  logger.warn('Auth misconfigured: no authorization configuration found; exporting no-op auth (tests).');

  // Re-export a no-op authenticate() so routes can still mount and respond 401
  module.exports = {
    // These help tests assert selection without crashing
    name: 'none',
    strategyName: 'none',

    // Route-level middleware that always 401s
    authenticate: () => (req, res) =>
      res.status(401).json({ status: 'error', error: { code: 401, message: 'unauthorized' } }),
  };

  // NOTE: no top-level return in CommonJS — just stop here by not continuing.
} else {
  const impl = useBearer ? require('./cognito') : require('./basic-auth');

  logger.info(`Auth: using ${useBearer ? 'Amazon Cognito (bearer tokens)' : 'HTTP Basic Auth'}`);

  // Self-register the strategy with passport on require (so unit tests work without app.js)
  if (typeof impl.strategy === 'function') {
    const strat = impl.strategy();
    if (strat) passport.use(strat);
    // Also expose the factory so app.js can register too (harmless if called twice)
    module.exports.strategy = impl.strategy;
  }

  // Re-export the route middleware
  module.exports.authenticate = impl.authenticate;

  // Give tests a stable name to assert on
  module.exports.name = useBearer ? 'cognito' : 'basic';
  module.exports.strategyName = module.exports.name;
}
