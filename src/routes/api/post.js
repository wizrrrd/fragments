//src/routes/api/post.js
const contentType = require('content-type');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

module.exports = async (req, res) => {
  const isBuffer = Buffer.isBuffer(req.body);
  const typeHeader = req.headers['content-type'];

  // Resolve ownerId from auth (it might be an object or a string depending on the auth layer)
  const ownerId =
    req.user && (typeof req.user === 'string' ? req.user : req.user.id);

  if (!ownerId) {
    // Auth should already protect /v1, but fail cleanly if somehow missing
    return res.status(401).json(createErrorResponse(401, 'unauthorized'));
  }

  // Must include a Content-Type
  if (!typeHeader) {
    logger.warn('POST /v1/fragments missing Content-Type');
    return res.status(415).json(createErrorResponse(415, 'unsupported type'));
  }

  // Parse and validate the content type
  let parsed;
  try {
    parsed = contentType.parse(typeHeader);
  } catch (err) {
    logger.warn({ err, typeHeader }, 'invalid Content-Type');
    return res.status(415).json(createErrorResponse(415, 'unsupported type'));
  }
  if (!Fragment.isSupportedType(parsed.type)) {
    logger.warn({ type: parsed.type }, 'unsupported Content-Type');
    return res.status(415).json(createErrorResponse(415, 'unsupported type'));
  }

  // Body must resolve to a Buffer
  let data;
  if (isBuffer) {
    data = req.body;
  } else if (typeof req.body === 'string') {
    data = Buffer.from(req.body, 'utf8');
  } else {
    return res.status(415).json(createErrorResponse(415, 'unsupported type'));
  }

  try {
    // Create + persist fragment
    const fragment = new Fragment({
      ownerId,
      type: typeHeader, // may include charset
      size: 0,
    });

    await fragment.save();
    await fragment.setData(data);

    // Prefer API_URL for Location; fall back to current host
    const base = process.env.API_URL || `http://${req.headers.host}`;
    const location = `${base}/v1/fragments/${fragment.id}`;
    res.set('Location', location);

    return res.status(201).json(createSuccessResponse({ fragment }));
  } catch (err) {
    logger.error({ err }, 'error creating fragment');
    return res.status(500).json(createErrorResponse(500, 'unable to process request'));
  }
};
