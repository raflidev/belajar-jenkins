const { test } = require('node:test');
const assert = require('node:assert/strict');
const server = require('../server');

test('GET / returns a welcome message', async () => {
  server.listen(0);
  const { port } = server.address();

  const res = await fetch(`http://localhost:${port}/`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.message, 'Halo dari belajar-jenkins!');

  server.close();
});

test('GET /health returns ok status', async () => {
  server.listen(0);
  const { port } = server.address();

  const res = await fetch(`http://localhost:${port}/health`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.status, 'ok');

  server.close();
});

test('unknown route returns 404', async () => {
  server.listen(0);
  const { port } = server.address();

  const res = await fetch(`http://localhost:${port}/nope`);

  assert.equal(res.status, 404);

  server.close();
});
