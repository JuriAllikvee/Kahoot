import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const hooks = {};
vm.runInNewContext(readFileSync('pb_hooks/main.pb.js', 'utf8'), {
  onRecordCreateRequest: (fn, name) => { hooks[`create:${name}`] = fn; },
  onRecordUpdateRequest: (fn, name) => { hooks[`update:${name}`] = fn; },
  BadRequestError: Error, ForbiddenError: Error,
  $security: { randomStringWithAlphabet: (length, alphabet) => { assert.equal(length, 6); assert.match(alphabet, /A.*Z/); return 'ABC123'; } },
});
const record = data => ({ getString: key => data[key] || '', getBool: key => !!data[key], set: (key, value) => { data[key] = value; } });
test('modern game hook replaces client code, enforces ownership and calls next', () => {
  const data = { quiz: 'q', host: 'h', code: 'FORGED', status: 'question' };
  let next = 0;
  const event = { auth: { id: 'h' }, record: record(data), app: {
    findRecordById: () => record({ owner: 'h', isPublished: true }), findRecordsByFilter: () => [],
  }, next: () => { next++; } };
  hooks['create:games'](event);
  assert.equal(data.code, 'ABC123'); assert.equal(data.status, 'lobby'); assert.equal(next, 1);
  event.auth = { id: 'other' };
  assert.throws(() => hooks['create:games'](event), /host|own/i);
  event.auth = { id: 'h' }; event.app.findRecordsByFilter = () => [{}];
  assert.throws(() => hooks['create:games'](event), /code/i);
});
test('answer creation and updates are explicitly disabled', () => {
  assert.throws(() => hooks['create:answers']({}), /not supported/i);
  assert.throws(() => hooks['update:answers']({}), /not supported/i);
});
