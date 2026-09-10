import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformAsync } from '@babel/core';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';


// Explicit local fake: no requests or writes to a real PocketBase server.
const records = { quizzes: [], questions: [] };
const calls = [];
let sequence = 0;
const pb = {
  filter: (expression, values) => JSON.stringify({ expression, values }),
  collection: name => ({
    async getFullList(params) {
      calls.push([name, 'list', params]);
      const { values } = JSON.parse(params.filter);
      return structuredClone(records[name].filter(row => name === 'quizzes' ? row.owner === values.owner : row.quiz === values.quiz));
    },
    async getOne(id) { return structuredClone(records[name].find(row => row.id === id)); },
    async create(data) { const row = { ...data, id: String(++sequence) }; records[name].push(row); return structuredClone(row); },
    async update(id, data) { const row = records[name].find(row => row.id === id); Object.assign(row, data); return structuredClone(row); },
    async delete(id) { records[name] = records[name].filter(row => row.id !== id); return true; },
  }),
};
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.confirm = () => true;
globalThis.__hostTest = { React, pb, useAuth: () => ({ user: { id: 'owner', name: 'Test host' }, isValid: true, loading: false, logout() {} }) };
let source = await readFile(new URL('./HostPage.jsx', import.meta.url), 'utf8');
source = source.replace(/import .* from ['"](.*?)['"];?/g, (line, path) => {
  if (path.includes('AuthContext')) return 'const { useAuth } = globalThis.__hostTest;';
  if (path.includes('AuthModal')) return 'const AuthModal = () => null;';
  if (path.includes('PageShell')) return 'const PageShell = ({children}) => children;';
  if (path.includes('pocketbase')) return 'const { pb } = globalThis.__hostTest;';
  if (path === 'react') return line.replace("'react'", JSON.stringify(import.meta.resolve('react')));
  return line.replace(path, new URL(path, import.meta.url).href);
});
const { code } = await transformAsync(source, { plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]], configFile: false, babelrc: false });
const { default: HostPage } = await import(`data:text/javascript;base64,${Buffer.from('const React = globalThis.__hostTest.React;\n' + code).toString('base64')}`);
const { createRoot } = await import('react-dom/client');
const root = createRoot(document.getElementById('root'));
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text && !node.disabled);
async function click(text) {
  const node = button(text);
  assert.ok(node, `Button exists: ${text}`);
  assert.equal(node.disabled, false, `Button enabled: ${text}`);
  await act(async () => { node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
}
async function fill(id, value) {
  const node = document.getElementById(id);
  assert.ok(node, `Input exists: ${id}`);
  const proto = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value);
    node.dispatchEvent(new window.Event('input', { bubbles: true }));
    node.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}

test('host can create, edit, reorder, publish, unpublish and delete questions using PocketBase records', async () => {
  records.quizzes.push({ id: 'other', owner: 'someone-else', title: 'Not mine', isPublished: true });
  await act(async () => { root.render(React.createElement(HostPage)); });
  assert.equal(document.body.textContent.includes('Not mine'), false);
  await fill('new-quiz-title', 'My quiz');
  await click('Create a quiz');
  assert.equal(records.quizzes.at(-1).owner, 'owner');
  assert.equal(records.quizzes.at(-1).isPublished, false);
  await click('Publish quiz');
  assert.match(document.querySelector('[role="alert"]').textContent, /at least one/i);
  await fill('quiz-title', 'Renamed quiz');
  await click('Save title');
  assert.equal(records.quizzes.at(-1).title, 'Renamed quiz');
  await click('Add question');
  await fill('question-text', 'First question');
  await click('Add option');
  await click('Add option');
  assert.ok(document.getElementById('option-3'));
  await act(async () => document.getElementById('correct-3').click());
  await act(async () => document.querySelector('[aria-label="Remove option 3"]').click());
  assert.equal(document.getElementById('correct-2').checked, true);
  await act(async () => document.querySelector('[aria-label="Remove option 3"]').click());
  assert.equal(document.querySelector('input[name="correct-answer"]:checked'), null);
  await fill('time-limit', '45');
  await fill('option-0', 'Yes');
  await fill('option-1', 'No');
  await act(async () => document.getElementById('correct-0').click());
  await click('Save question');
  assert.equal(records.questions[0].correctIndex, 0);
  assert.equal(records.questions[0].order, 1);
  await click('Add question');
  await fill('question-text', 'Second question');
  await fill('option-0', 'A');
  await fill('option-1', 'B');
  await act(async () => document.getElementById('correct-1').click());
  await click('Save question');
  await click('Move up');
  assert.ok(records.questions.find(q => q.text === 'Second question').order < records.questions.find(q => q.text === 'First question').order);
  await click('Edit question');
  await fill('question-text', 'Updated question');
  await click('Save question');
  assert.ok(records.questions.some(q => q.text === 'Updated question'));
  await click('Publish quiz');
  assert.equal(records.quizzes.at(-1).isPublished, true);
  assert.ok(button('Unpublish quiz'));
  await click('Unpublish quiz');
  await click('Delete question');
  assert.equal(records.questions.length, 1);
  assert.ok(calls.some(([name, action, params]) => name === 'quizzes' && action === 'list' && JSON.parse(params.filter).values.owner === 'owner'));
  await act(async () => root.unmount());
});
