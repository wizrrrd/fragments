// tests/unit/app.test.js
const request = require('supertest');
const app = require('../../src/app');

test('unknown routes return 404 with expected error payload', async () => {
  const res = await request(app).get('/definitely-not-a-route');
  expect(res.statusCode).toBe(404);
  expect(res.body).toEqual({
    status: 'error',
    error: { message: 'not found', code: 404 },
  });
});

test('404 responses are JSON', async () => {
  const res = await request(app).get('/still-not-a-route');
  expect(res.headers['content-type']).toMatch(/application\/json/);
});
