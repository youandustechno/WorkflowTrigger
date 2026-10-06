const test = require('node:test');
const assert = require('node:assert/strict');

const { validateDispatchPayload } = require('../server.js');

test('rejects more than 20 selected apps', () => {
  const apps = Array.from({ length: 21 }, (_, index) => `App-${index + 1}`);

  assert.throws(() => {
    validateDispatchPayload({
      owner: 'OWNER',
      repo: 'REPO',
      eventType: 'build-apps',
      apps,
      githubToken: 'token'
    });
  }, /at most 20/i);
});
