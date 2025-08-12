// src/response.js

/**
 * A successful response looks like:
 *
 * {
 *   "status": "ok",
 *   ...
 * }
 */
function createSuccessResponse(data={}) {
  return {
    status: 'ok',
    ...(data),
  };
}

/**
 * An error response looks like:
 *
 * {
 *   "status": "error",
 *   "error": {
 *     "code": 400,
 *     "message": "invalid request, missing ...",
 *   }
 * }
 */
function createErrorResponse(code=400, message="Invalid request!") {
  return {
    status: 'error',
    error: { code, message },
  };
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
};
