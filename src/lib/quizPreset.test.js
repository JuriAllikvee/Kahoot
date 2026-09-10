import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublication } from './quizValidation.js';

const load = () => import('./quizPreset.js');

// Local record store only; models uniqueness, missing records and readback failures.
function fakePocketBase() {
  const records = { quizzes: new Map(), questions: new Map() };
  const calls = [];
  const pb = { records, calls, failAt: 0, corrupt: false,
    collection: name => ({
      async getOne(id) {
        calls.push(['read', name, id]);
        if (!records[name].has(id)) throw Object.assign(new Error('Not found'), { status: 404 });
        return structuredClone(records[name].get(id));
      },
      async create(data) {
        calls.push(['create', name, data.id]);
        assert.match(data.id, /^[a-z0-9]{15}$/);
        if (name === 'questions' && data.order === pb.failAt) throw new Error('Offline');
        if (records[name].has(data.id)) throw Object.assign(new Error('Duplicate'), { status: 400 });
        records[name].set(data.id, structuredClone(pb.corrupt && name === 'questions' ? { ...data, correctIndex: 3 } : data));
        return structuredClone(data);
      },
      async update(id, data) {
        calls.push(['update', name, id]);
        Object.assign(records[name].get(id), structuredClone(data));
        return structuredClone(records[name].get(id));
      },
    }),
  };
  return pb;
}

test('saving twice reuses owner preset, preserves edits and deleted questions', async () => {
  const { saveReadyMadeQuiz } = await load();
  const pb = fakePocketBase();
  const first = await saveReadyMadeQuiz(pb, 'owner');
  assert.equal(pb.records.questions.size, 10);
  pb.records.quizzes.get(first.id).title = 'My edited title';
  pb.records.questions.delete([...pb.records.questions.keys()].at(-1));
  const writes = pb.calls.filter(c => c[0] !== 'read').length;
  const second = await saveReadyMadeQuiz(pb, 'owner');
  assert.equal(first.id, second.id);
  assert.equal(second.title, 'My edited title');
  assert.equal(pb.records.questions.size, 9);
  assert.equal(pb.calls.filter(c => c[0] !== 'read').length, writes);
  await saveReadyMadeQuiz(pb, 'other-owner');
  assert.equal(pb.records.quizzes.size, 2);
});

test('partial saves resume without duplicate questions', async () => {
  const { saveReadyMadeQuiz } = await load();
  const pb = fakePocketBase();
  pb.failAt = 5;
  await assert.rejects(saveReadyMadeQuiz(pb, 'owner'), /Offline/);
  assert.equal(pb.records.questions.size, 4);
  pb.failAt = 0;
  await saveReadyMadeQuiz(pb, 'owner');
  assert.equal(pb.records.quizzes.size, 1);
  assert.equal(pb.records.questions.size, 10);
  for (const id of pb.records.questions.keys()) {
    assert.ok(pb.calls.some(call => call[0] === 'read' && call[2] === id));
  }
});

test('concurrent uses converge on the same records', async () => {
  const { saveReadyMadeQuiz } = await load();
  const pb = fakePocketBase();
  const [a, b] = await Promise.all([saveReadyMadeQuiz(pb, 'owner'), saveReadyMadeQuiz(pb, 'owner')]);
  assert.equal(a.id, b.id);
  assert.equal(pb.records.quizzes.size, 1);
  assert.equal(pb.records.questions.size, 10);
});

test('readback mismatch stops import and leaves existing content untouched on retry', async () => {
  const { saveReadyMadeQuiz } = await load();
  const pb = fakePocketBase();
  pb.corrupt = true;
  await assert.rejects(saveReadyMadeQuiz(pb, 'owner'), /could not be verified/);
  const saved = structuredClone([...pb.records.questions.values()]);
  pb.corrupt = false;
  await assert.rejects(saveReadyMadeQuiz(pb, 'owner'), /could not be verified/);
  assert.deepEqual([...pb.records.questions.values()], saved);
  assert.equal(pb.calls.filter(call => call[0] === 'update').length, 0);
});

test('missing account never writes records', async () => {
  const { saveReadyMadeQuiz } = await load();
  const pb = fakePocketBase();
  await assert.rejects(saveReadyMadeQuiz(pb, ''), /Sign in/);
  assert.equal(pb.calls.length, 0);
});

test('Russian preset has ten complete, ordered questions with varied correct answers', async () => {
  const { READY_MADE_QUIZ } = await load();
  assert.equal(READY_MADE_QUIZ.questions.length, 10);
  validatePublication(READY_MADE_QUIZ.title, READY_MADE_QUIZ.questions);
  assert.deepEqual(READY_MADE_QUIZ.questions.map(q => q.order), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(new Set(READY_MADE_QUIZ.questions.map(q => q.text)).size, 10);
  assert.ok(new Set(READY_MADE_QUIZ.questions.map(q => q.correctIndex)).size > 1);
});
