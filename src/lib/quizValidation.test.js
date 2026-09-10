import test from 'node:test';
import assert from 'node:assert/strict';
import * as validation from './quizValidation.js';
const complete = { text: ' Question ', options: [' First ', 'Second'], correctIndex: 0, timeLimit: 20 };

test('complete questions preserve correct index zero and normalize text', () => {
  assert.equal(typeof validation.validateQuestion, 'function');
  assert.deepEqual(validation.validateQuestion(complete), { ...complete, text: 'Question', options: ['First', 'Second'] });
  for (const changes of [
    { text: '' }, { text: 'x'.repeat(301) }, { options: ['one'] },
    { options: ['a', 'b', 'c', 'd', 'e'] }, { options: ['a', ' '] },
    { correctIndex: '' }, { correctIndex: null }, { correctIndex: -1 }, { correctIndex: 2 },
    { correctIndex: 0.5 }, { timeLimit: 4 }, { timeLimit: 301 }, { timeLimit: 5.5 },
  ]) assert.throws(() => validation.validateQuestion({ ...complete, ...changes }));
  for (const timeLimit of [5, 300]) assert.equal(validation.validateQuestion({ ...complete, timeLimit }).timeLimit, timeLimit);
  assert.equal(validation.validateQuestion({ ...complete, text: 'x'.repeat(300), options: ['a', 'b', 'c', 'd'], correctIndex: 3 }).correctIndex, 3);
});

test('publishing requires a valid title and every question complete', () => {
  assert.equal(typeof validation.validatePublication, 'function');
  assert.throws(() => validation.validatePublication('Quiz', []), /at least one/i);
  assert.throws(() => validation.validatePublication('', [complete]), /Title/);
  assert.throws(() => validation.validatePublication('Quiz', [complete, { ...complete, text: '' }]), /Question 2/);
  assert.doesNotThrow(() => validation.validatePublication('Quiz', [complete]));
});

test('PocketBase field errors include field paths and actionable connection feedback', () => {
  assert.equal(typeof validation.formatQuizError, 'function');
  assert.match(validation.formatQuizError({ response: { message: 'Failed to create record.', data: { correctIndex: { code: 'validation_required', message: 'Cannot be blank.' } } } }), /correctIndex: Cannot be blank/);
  assert.match(validation.formatQuizError({ status: 0 }), /connect/i);
  assert.match(validation.formatQuizError(new Error('Local validation')), /Local validation/);
});

test('quiz titles are trimmed, required and limited to 100 characters', () => {
  assert.equal(typeof validation.validateTitle, 'function');
  assert.equal(validation.validateTitle('  Quiz  '), 'Quiz');
  assert.equal(validation.validateTitle('a'.repeat(100)).length, 100);
  for (const title of ['', '   ', 'a'.repeat(101)]) assert.throws(() => validation.validateTitle(title));
});
