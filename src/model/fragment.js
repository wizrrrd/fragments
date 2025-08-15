// src/model/fragment.js
const { randomUUID } = require('crypto');
const contentType = require('content-type');

const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data'); // ensure src/model/data/index.js exists and re-exports './memory'

// ✅ Support both text/plain and text/markdown (assignment 2)
const SUPPORTED_BASE_TYPES = new Set(['text/plain', 'text/markdown']);

// Optional: declare which converted formats are allowed (markdown → html)
const ALLOWED_CONVERSIONS = {
  'text/markdown': new Set(['text/html']),
  'text/plain': new Set([]),
};

const now = () => new Date().toISOString();

class Fragment {
  constructor({ id, ownerId, created, updated, type, size = 0 }) {
    if (!ownerId) throw new Error('ownerId is required');
    if (!type) throw new Error('type is required');
    if (!Fragment.isSupportedType(type)) throw new Error(`unsupported type: ${type}`);
    if (typeof size !== 'number' || Number.isNaN(size)) throw new Error('size must be a number');
    if (size < 0) throw new Error('size cannot be negative');

    this.id = id || randomUUID();
    this.ownerId = ownerId;
    this.type = type;
    this.size = size;
    this.created = created || now();
    this.updated = updated || this.created;
  }

  static async byUser(ownerId, expand = false) {
    if (!ownerId) return [];
    const items = await listFragments(ownerId, expand);
    if (!expand) return items;
    return items.map((meta) => new Fragment(meta));
  }

  static async byId(ownerId, id) {
    const meta = await readFragment(ownerId, id);
    if (!meta) throw new Error('fragment not found');
    return new Fragment(meta);
  }

  static delete(ownerId, id) {
    return deleteFragment(ownerId, id);
  }

  async save() {
    this.updated = now();
    await writeFragment(this);
  }

  getData() {
    return readFragmentData(this.ownerId, this.id);
  }

  async setData(data) {
    if (!Buffer.isBuffer(data)) throw new Error('data must be a Buffer');
    await writeFragmentData(this.ownerId, this.id, data);
    this.size = data.length;
    this.updated = now();
    await writeFragment(this);
  }

  get mimeType() {
    const { type } = contentType.parse(this.type);
    return type;
  }

  get isText() {
    return this.mimeType.startsWith('text/');
  }

  // ✅ Advertise available formats for this fragment instance
  get formats() {
    const base = this.mimeType;
    const extras = ALLOWED_CONVERSIONS[base] ? Array.from(ALLOWED_CONVERSIONS[base]) : [];
    // Always include the original type itself first
    return [base, ...extras];
  }

  // ✅ Static helper (some routes prefer asking “what could this type convert to?”)
  static getAvailableFormats(type) {
    const { type: base } = contentType.parse(type);
    const extras = ALLOWED_CONVERSIONS[base] ? Array.from(ALLOWED_CONVERSIONS[base]) : [];
    return [base, ...extras];
  }

  // ✅ Provide a JSON representation (fixes /info route expecting fragment.toJSON())
  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      created: this.created,
      updated: this.updated,
      type: this.type,
      size: this.size,
    };
  }

  static isSupportedType(value) {
    try {
      const { type } = contentType.parse(value);
      return SUPPORTED_BASE_TYPES.has(type);
    } catch {
      return false;
    }
  }
}

module.exports.Fragment = Fragment;
