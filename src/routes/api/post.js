// src/routes/api/post.js
const contentType = require('content-type');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

module.exports = async (req, res) => {
  const typeHeader = req.headers['content-type'];

  // Body should already be a Buffer thanks to rawBody(), but be defensive
  let data = Buffer.isBuffer(req.body)
    ? req.body
    : typeof req.body === 'string'
      ? Buffer.from(req.body, 'utf8')
      : null;

  // Ensure we have an authenticated user (authorize middleware should have set req.user.id)
  const ownerId = req.user && req.user.id;
  if (!ownerId) {
    logger.warn('POST /v1/fragments missing req.user.id');
    return res.status(401).json(createErrorResponse(401, 'unauthorized'));
  }

  // Must include a Content-Type
  if (!typeHeader) {
    logger.warn('POST /v1/fragments missing Content-Type');
    return res.status(415).json(createErrorResponse(415, 'unsupported type'));
  }

  // Validate content type
  try {
    const { type } = contentType.parse(typeHeader);
    if (!Fragment.isSupportedType(type)) {
      logger.warn({ type }, 'unsupported Content-Type');
      return res.status(415).json(createErrorResponse(415, 'unsupported type'));
    }
  } catch (err) {
    logger.warn({ err, typeHeader }, 'invalid Content-Type');
    return res.status(415).json(createErrorResponse(415, 'unsupported type'));
  }

  // Validate body
  if (!data) {
    logger.warn('POST /v1/fragments body not Buffer or string');
    return res.status(415).json(createErrorResponse(415, 'unsupported type'));
  }

  try {
    // Create + persist fragment
    const fragment = new Fragment({
      ownerId,           // hashed id
      type: typeHeader,  // may include charset
      size: 0,           // will be set by setData()
    });

    await fragment.save();
    await fragment.setData(data);

    // Build Location header. Prefer API_URL; fall back to current host
    const base = process.env.API_URL || `http://${req.headers.host}`;
    const location = `${base}/v1/fragments/${fragment.id}`;
    res.set('Location', location);

    return res.status(201).json(createSuccessResponse({ fragment }));
  } catch (err) {
    logger.error({ err }, 'error creating fragment');
    return res.status(500).json(createErrorResponse(500, 'unable to process request'));
  }
};
