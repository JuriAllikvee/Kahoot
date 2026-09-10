import { validatePublication, validateQuestion } from './quizValidation.js';

// Versioned identity: renaming a saved quiz must not create another copy.
export const READY_MADE_QUIZ = {
  version: 'general-it-ru-v1',
  title: 'Эрудиция и IT — готовый квиз',
  questions: [
    ['Какой язык разметки задаёт структуру веб-страницы?', ['HTML', 'CSS', 'SQL', 'Python'], 0],
    ['Что означает CPU?', ['Оперативная память', 'Центральный процессор', 'Сетевая карта', 'Жёсткий диск'], 1],
    ['Какой город является столицей Франции?', ['Рим', 'Берлин', 'Париж', 'Мадрид'], 2],
    ['Сколько бит в одном байте?', ['2', '4', '16', '8'], 3],
    ['Какой протокол используется для защищённого просмотра веб-страниц?', ['HTTPS', 'HTTP', 'FTP', 'SMTP'], 0],
    ['Какая планета известна как Красная планета?', ['Венера', 'Марс', 'Юпитер', 'Меркурий'], 1],
    ['Для чего в первую очередь используют Git?', ['Для обработки фото', 'Для просмотра сайтов', 'Для контроля версий', 'Для шифрования дисков'], 2],
    ['Какой тип данных представляет значения true и false?', ['String', 'Array', 'Number', 'Boolean'], 3],
    ['Какой океан самый большой по площади?', ['Тихий', 'Атлантический', 'Индийский', 'Северный Ледовитый'], 0],
    ['Для чего используется SQL-команда SELECT?', ['Удаление таблицы', 'Выборка данных', 'Создание базы', 'Изменение пароля'], 1],
  ].map(([text, options, correctIndex], index) => ({ text, options, correctIndex, timeLimit: 20, order: index + 1 })),
};

validatePublication(READY_MADE_QUIZ.title, READY_MADE_QUIZ.questions);

const pendingTitle = '[Preparing] ' + READY_MADE_QUIZ.title;

async function recordId(owner, slot) {
  const bytes = new TextEncoder().encode(JSON.stringify([owner, READY_MADE_QUIZ.version, slot]));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 15);
}

async function readOrCreate(collection, data) {
  try { return { record: await collection.getOne(data.id, { requestKey: null }), created: false }; }
  catch (error) { if (error.status !== 404) throw error; }
  try { await collection.create(data, { requestKey: null }); }
  catch (error) {
    // A competing tab or a lost response may have already persisted this ID.
    try { return { record: await collection.getOne(data.id, { requestKey: null }), created: false }; }
    catch { throw error; }
  }
  return { record: await collection.getOne(data.id, { requestKey: null }), created: true };
}

export async function saveReadyMadeQuiz(pb, owner) {
  if (!owner) throw new Error('Sign in before using the ready-made quiz.');
  const quizzes = pb.collection('quizzes');
  const questions = pb.collection('questions');
  const id = await recordId(owner, 'quiz');
  const { record: quiz } = await readOrCreate(quizzes, { id, owner, title: pendingTitle, isPublished: false });
  if (quiz.owner !== owner) throw new Error('This quiz does not belong to your account.');
  // The temporary title is an import checkpoint using only existing schema fields.
  // Once completed (or explicitly renamed), never restore edited/deleted questions.
  if (quiz.title !== pendingTitle) return quiz;
  if (quiz.isPublished) throw new Error('Unpublish the unfinished ready-made quiz before retrying.');
  for (const preset of READY_MADE_QUIZ.questions) {
    const data = { ...preset, id: await recordId(owner, `question-${preset.order}`), quiz: id };
    const { record } = await readOrCreate(questions, data);
    if (record.quiz !== id || record.order !== preset.order ||
        JSON.stringify(validateQuestion(record)) !== JSON.stringify(validateQuestion(preset))) {
      throw new Error('The unfinished preset has changed or could not be verified. Review it in your library; no existing questions were overwritten.');
    }
  }
  // Re-read immediately before finalizing; never overwrite a deliberate rename.
  const current = await quizzes.getOne(id, { requestKey: null });
  if (current.owner !== owner) throw new Error('This quiz does not belong to your account.');
  if (current.title !== pendingTitle) return current;
  if (current.isPublished) throw new Error('Unpublish the unfinished ready-made quiz before retrying.');
  await quizzes.update(id, { title: READY_MADE_QUIZ.title }, { requestKey: null });
  const verified = await quizzes.getOne(id, { requestKey: null });
  if (verified.owner !== owner || verified.title !== READY_MADE_QUIZ.title) throw new Error('The ready-made quiz could not be verified. Reload before retrying.');
  return verified;
}

