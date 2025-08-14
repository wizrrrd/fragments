//tests/unit/fragment.test.js
const request = require('supertest');
const app = require('../../src/app');

const auth = () =>
  'Basic ' + Buffer.from('user1@email.com:password1').toString('base64');

const UUID_RE =
  /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;

describe('POST /v1/fragments', () => {
  test('unauthenticated requests are denied (401)', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .send('hello');
    expect(res.status).toBe(401);
  });

  test('unsupported content type returns 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Authorization', auth())
      .set('Content-Type', 'application/msword')
      .send('hello');
    expect(res.status).toBe(415);
    expect(res.body.status).toBe('error');
  });

  test('authenticated users can create text/plain fragment', async () => {
    const body = 'hello world';
    const res = await request(app)
      .post('/v1/fragments')
      .set('Authorization', auth())
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');

    const { fragment } = res.body;
    expect(fragment).toBeDefined();
    expect(fragment.id).toMatch(UUID_RE);
    expect(fragment.type).toBe('text/plain; charset=utf-8');
    expect(fragment.size).toBe(Buffer.byteLength(body, 'utf8'));

    // Location header is a full URL and points to this fragment
    expect(res.headers.location).toBeDefined();
    expect(res.headers.location.endsWith(`/v1/fragments/${fragment.id}`)).toBe(true);
    expect(res.headers.location.startsWith('http')).toBe(true);
  });

  test('Location header uses API_URL when provided', async () => {
    const prev = process.env.API_URL;
    process.env.API_URL = 'http://example.com:9999';

    const res = await request(app)
      .post('/v1/fragments')
      .set('Authorization', auth())
      .set('Content-Type', 'text/plain')
      .send('X');

    const { fragment } = res.body;
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(
      `http://example.com:9999/v1/fragments/${fragment.id}`
    );

    if (prev === undefined) delete process.env.API_URL;
    else process.env.API_URL = prev;
  });
});
