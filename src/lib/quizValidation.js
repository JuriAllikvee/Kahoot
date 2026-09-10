export function validatePublication(title, questions) {
  validateTitle(title);
  if (!questions.length) throw new Error('Add at least one complete question before publishing.');
  questions.forEach((question, index) => {
    try { validateQuestion(question); }
    catch (error) { throw new Error(`Question ${index + 1}: ${error.message}`); }
  });
}

export function formatQuizError(error) {
  const details = [];
  function visit(value, path = '') {
    if (!value || typeof value !== 'object') return;
    if (value.message) details.push(`${path}: ${value.message}`);
    else for (const [key, child] of Object.entries(value)) visit(child, path ? `${path}.${key}` : key);
  }
  visit(error?.response?.data);
  const message = error?.status === 0
    ? 'Could not connect to PocketBase. Check your connection and server URL.'
    : error?.response?.message || error?.message || 'The request failed. Please try again.';
  return [message, ...details].join(' ');
}

export function validateQuestion(value) {
  const text = typeof value.text === 'string' ? value.text.trim() : '';
  if (!text || text.length > 300) throw new Error('Question text must contain 1–300 characters.');
  if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 4)
    throw new Error('Provide 2–4 answer options.');
  const options = value.options.map(option => typeof option === 'string' ? option.trim() : '');
  if (options.some(option => !option)) throw new Error('Every answer option must contain text.');
  const { correctIndex } = value;
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length)
    throw new Error('Select a correct answer.');
  const timeLimit = Number(value.timeLimit);
  if (!Number.isInteger(timeLimit) || timeLimit < 5 || timeLimit > 300)
    throw new Error('Time limit must be a whole number from 5 to 300 seconds.');
  return { text, options, correctIndex, timeLimit };
}

export function validateTitle(value) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title || title.length > 100) throw new Error('Title must contain 1–100 characters.');
  return title;
}
