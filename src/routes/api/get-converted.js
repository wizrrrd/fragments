// src/routes/api/get-converted.js
//
// Conversion handler for GET /v1/fragments/:id.:ext
// For Assignment 2, only markdown -> html is required.

const MarkdownIt = require('markdown-it');
const { Fragment } = require('../../model/fragment');
const hash = require('../../hash');
const logger = require('../../logger');

const md = new MarkdownIt();

/**
 * Helper to normalize owner id for Basic/Bearer auth.
 */
function ownerIdFrom(req) {
  const u = req.user?.id || req.user?.email || req.user;
  if (!u) return undefined;
  return /@/.test(u) ? hash(u) : u;
}

module.exports = async function getConverted(req, res) {
  try {
    const ownerId = ownerIdFrom(req);
    const id = req.params.id;
    const ext = (req.params.ext || '').toLowerCase();

    const fragment = await Fragment.byId(ownerId, id);
    const data = await fragment.getData();
    const type = fragment.type || fragment.mimeType || 'application/octet-stream';

    // Only support markdown -> html for A2
    if (ext === 'html' && /^text\/markdown/i.test(type)) {
      const html = md.render(data.toString('utf8'));
      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // Optionally, allow ".txt" passthrough for text types (harmless and handy)
    if (ext === 'txt' && /^text\//i.test(type)) {
      res.set('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(data.toString('utf8'));
    }

    // Everything else is unsupported
    return res
      .status(415)
      .json({ status: 'error', error: { message: `cannot convert ${type} to .${ext}`, code: 415 } });
  } catch (err) {
    if ((err && err.message) === 'fragment not found') {
      return res.status(404).json({ status: 'error', error: { message: 'not found', code: 404 } });
    }
    logger.error({ err }, 'error in GET /v1/fragments/:id.:ext');
    return res
      .status(500)
      .json({ status: 'error', error: { message: err.message || 'unable to process request', code: 500 } });
  }
};
