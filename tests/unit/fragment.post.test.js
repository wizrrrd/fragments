//tests/unit/fragment.post.test.js
const request = require('supertest');
const app = require('../../src/app');

const authUser = (r) => r.auth('user1@email.com', 'password1');

describe('POST /v1/fragments', () => {
  test('unauthenticated requests are denied (401)', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .send('hello');
    expect(res.status).toBe(401);
  });

  test('unsupported content type returns 415', async () => {
    const res = await authUser(request(app).post('/v1/fragments'))
      .set('Content-Type', 'application/msword')
      .send('nope');
    expect(res.status).toBe(415);
    expect(res.body.status).toBe('error');
  });

  test('authenticated users can create text/plain fragment', async () => {
    const body = 'hello world';
    const res = await authUser(request(app).post('/v1/fragments'))
      .set('Content-Type', 'text/plain')
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');

    const { fragment } = res.body;
    expect(fragment).toBeDefined();
    expect(fragment.type).toBe('text/plain');
    expect(fragment.size).toBe(body.length);
    expect(fragment.ownerId).toBeDefined();
    expect(fragment.id).toMatch(
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
    );

    // Location header present and points to this fragment
    expect(res.headers.location).toBeDefined();
    expect(res.headers.location).toMatch(new RegExp(`/v1/fragments/${fragment.id}$`));
  });

  test('Location header uses API_URL when provided', async () => {
    const prev = process.env.API_URL;
    process.env.API_URL = 'http://example.com:9999';

    const res = await authUser(request(app).post('/v1/fragments'))
      .set('Content-Type', 'text/plain')
      .send('abc');

    expect(res.status).toBe(201);
    const { fragment } = res.body;
    expect(res.headers.location).toBe(
      `http://example.com:9999/v1/fragments/${fragment.id}`
    );

    process.env.API_URL = prev;
  });
});
