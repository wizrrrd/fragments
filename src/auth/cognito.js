// src/auth/cognito.js
//
// Bearer strategy for Amazon Cognito. Verifies the incoming JWT (ID or Access token)
// using Cognito's JWKS, then passes the user's email to our authorize middleware.
// Keep logs minimal but helpful.

const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const logger = require('../logger');
const authorize = require('./auth-middleware');

// --- Config & helpers --------------------------------------------------------

const POOL_ID   = process.env.AWS_COGNITO_POOL_ID;   // e.g., us-east-1_abc123
const CLIENT_ID = process.env.AWS_COGNITO_CLIENT_ID; // your app client id

if (!POOL_ID || !CLIENT_ID) {
  throw new Error('Cognito auth requires AWS_COGNITO_POOL_ID and AWS_COGNITO_CLIENT_ID');
}

// Derive region from pool (part before the underscore)
const REGION = (POOL_ID.split('_')[0] || '').trim();
if (!REGION) {
  throw new Error(`Unable to derive AWS region from AWS_COGNITO_POOL_ID='${POOL_ID}'`);
}

const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}`;
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;

// jose JWKS fetcher (cached/rotated for you)
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

async function verifyToken(token) {
  // Accept ID or Access tokens; enforce issuer; for ID tokens also enforce audience
  const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
    issuer: ISSUER,
    // We'll validate audience for ID tokens; access tokens don't carry "aud"
    // jose allows runtime checks after verification:
  });

  // If it's an ID token, ensure the aud matches our client
  // Heuristic: ID token usually has "token_use":"id" and an "aud"; access tokens: "token_use":"access"
  if (payload.token_use === 'id' && payload.aud && payload.aud !== CLIENT_ID) {
    throw new Error(`Invalid audience (got ${payload.aud})`);
  }

  // Prefer email; fall back to username-ish claims
  const email =
    payload.email ||
    payload['cognito:username'] ||
    payload.username ||
    payload.sub; // last resort: subject

  if (!email) {
    throw new Error('Verified token has no email/username claim');
  }

  return { email, payload, header: protectedHeader };
}

// --- Passport Strategy --------------------------------------------------------

module.exports.strategy = () =>
  new BearerStrategy(async (token, done) => {
    try {
      const { email } = await verifyToken(token);
      // Pass the email to passport -> our authorize() will hash + set req.user.id
      return done(null, email);
    } catch (err) {
      // Wrong/expired token, signature invalid, wrong issuer/audience, etc.
      logger.warn({ err: err.message }, 'Cognito token verification failed');
      return done(null, false);
    }
  });

// --- Route middleware (uses our custom authorize wrapper) ---------------------

module.exports.authenticate = () => {
  logger.info('Using Cognito Bearer auth');
  return authorize('bearer');
};
