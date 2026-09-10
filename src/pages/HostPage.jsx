import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import PageShell from '../components/PageShell';
import { pb } from '../lib/pocketbase';
import { formatQuizError, validatePublication, validateQuestion, validateTitle } from '../lib/quizValidation.js';

export default function HostPage() {
  const { user, isValid, logout, loading } = useAuth();
  if (loading) return <PageShell><main id="main" className="form-main"><p role="status">Loading your account…</p></main></PageShell>;
  if (!isValid) return <AuthModal />;
  return <HostWorkspace key={user.id} user={user} logout={logout} />;
}

function HostWorkspace({ user, logout }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const locked = useRef(false);

  const listQuizzes = () => pb.collection('quizzes').getFullList({
    filter: pb.filter('owner = {:owner}', { owner: user.id }), sort: '-created', requestKey: null,
  });
  const listQuestions = id => pb.collection('questions').getFullList({
    filter: pb.filter('quiz = {:quiz}', { quiz: id }), sort: 'order,id', requestKey: null,
  });

  useEffect(() => {
    let active = true;
    pb.collection('quizzes').getFullList({
      filter: pb.filter('owner = {:owner}', { owner: user.id }), sort: '-created', requestKey: null,
    }).then(rows => { if (active) setQuizzes(rows); })
      .catch(err => { if (active) setError(formatQuizError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id]);

  async function run(action, message = '') {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); }
    catch (err) { setError(formatQuizError(err)); }
    finally { locked.current = false; setBusy(false); }
  }

  async function reloadQuiz(id) {
    const [quiz, rows] = await Promise.all([
      pb.collection('quizzes').getOne(id, { requestKey: null }), listQuestions(id),
    ]);
    if (quiz.owner !== user.id) throw new Error('This quiz does not belong to your account.');
    setSelected(quiz); setTitle(quiz.title); setQuestions(rows);
    setQuizzes(current => current.map(item => item.id === id ? quiz : item));
    return { quiz, rows };
  }

  function openQuiz(id) {
    if (draft && !window.confirm('Discard unsaved question changes?')) return;
    run(async () => { await reloadQuiz(id); setDraft(null); });
  }

  function createQuiz(event) {
    event.preventDefault();
    run(async () => {
      const cleanTitle = validateTitle(newTitle);
      const created = await pb.collection('quizzes').create({ title: cleanTitle, owner: user.id, isPublished: false });
      // Read the exact record back before reporting success.
      await reloadQuiz(created.id);
      setQuizzes(await listQuizzes()); setNewTitle(''); setDraft(null);
    }, 'Quiz created. Add your first question.');
  }

  async function requireDraft() {
    const quiz = await pb.collection('quizzes').getOne(selected.id, { requestKey: null });
    if (quiz.owner !== user.id) throw new Error('This quiz does not belong to your account.');
    if (quiz.isPublished) throw new Error('Unpublish this quiz before editing it.');
    return quiz;
  }

  function saveQuestion(event) {
    event.preventDefault();
    run(async () => {
      const data = validateQuestion(draft);
      await requireDraft();
      const collection = pb.collection('questions');
      let saved;
      if (draft.id) saved = await collection.update(draft.id, data);
      else {
        const current = await listQuestions(selected.id);
        // Required PocketBase numbers reject zero: ordering is deliberately 1-based.
        const order = Math.max(0, ...current.map(q => Number(q.order) || 0)) + 1;
        saved = await collection.create({ ...data, quiz: selected.id, order });
      }
      const verified = await collection.getOne(saved.id, { requestKey: null });
      if (JSON.stringify(validateQuestion(verified)) !== JSON.stringify(data)) throw new Error('The saved question could not be verified. Reload before retrying.');
      setQuestions(await listQuestions(selected.id)); setDraft(null);
    }, 'Question saved.');
  }

  function togglePublish() {
    run(async () => {
      if (draft) throw new Error('Save or cancel the question you are editing first.');
      const { quiz, rows } = await reloadQuiz(selected.id);
      if (!quiz.isPublished) validatePublication(quiz.title, rows);
      const published = !quiz.isPublished;
      await pb.collection('quizzes').update(quiz.id, { isPublished: published });
      const result = await reloadQuiz(quiz.id);
      if (result.quiz.isPublished !== published) throw new Error('Publication status could not be verified. Reload before retrying.');
    }, selected.isPublished ? 'Quiz unpublished.' : 'Quiz published. Live gameplay is not available yet.');
  }

  function deleteQuestion(question) {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;
    run(async () => {
      await requireDraft();
      await pb.collection('questions').delete(question.id);
      const rows = await listQuestions(selected.id);
      setQuestions(rows);
      if (rows.some(row => row.id === question.id)) throw new Error('Deletion could not be verified. Reload before retrying.');
    }, 'Question deleted.');
  }

  function moveQuestion(index, direction) {
    run(async () => {
      await requireDraft();
      const rows = [...questions];
      [rows[index], rows[index + direction]] = [rows[index + direction], rows[index]];
      try {
        // No batch-API requirement; surface partial failures and reload server order.
        for (const [position, question] of rows.entries()) {
          await pb.collection('questions').update(question.id, { order: position + 1 });
        }
      } catch (err) {
        setQuestions(await listQuestions(selected.id));
        throw new Error(`Reordering may have been partially saved. Review the current order and retry. ${formatQuizError(err)}`);
      }
      const verified = await listQuestions(selected.id);
      verified.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      setQuestions(verified);
      if (verified.map(q => q.id).join() !== rows.map(q => q.id).join()) throw new Error('Order could not be verified. Reload and retry.');
    }, 'Question order saved.');
  }

  function editQuestion(question) {
    setError(''); setNotice('');
    setDraft(question ? { ...question, options: Array.isArray(question.options) ? [...question.options] : ['', ''] }
      : { text: '', options: ['', ''], correctIndex: null, timeLimit: 20 });
  }
  const disabled = busy || loading;
  const readOnly = disabled || selected?.isPublished;

  return <PageShell actions={<button className="button secondary compact" disabled={busy} onClick={logout}>Sign out</button>}>
    <main id="main" className="container dashboard" aria-busy={busy}>
      <div className="page-heading"><div><p className="eyebrow">HOST SPACE</p><h1>Your quizzes</h1><p>Create questions, choose the answers, and publish when ready.</p></div><span className="account-label">{user.name || user.email}</span></div>
      {error && <div className="error-message" role="alert">{error}</div>}
      <p className="host-notice" role="status">{busy ? 'Saving or loading…' : notice}</p>
      <form className="host-create" onSubmit={createQuiz}>
        <div className="field"><label htmlFor="new-quiz-title">New quiz title</label><input id="new-quiz-title" value={newTitle} onChange={event => setNewTitle(event.target.value)} maxLength={100} required disabled={disabled || !!draft} placeholder="e.g. Friday trivia" /></div>
        <button className="button primary" disabled={disabled || !!draft}>Create a quiz</button>
      </form>
      <div className="host-layout">
        <section className="quiz-library" aria-label="Your quizzes">
          <div className="host-section-heading"><h2>Quiz library</h2><button className="text-button" disabled={disabled} onClick={() => run(async () => setQuizzes(await listQuizzes()))}>Refresh list</button></div>
          {loading ? <p role="status">Loading quizzes…</p> : quizzes.length === 0 ? <p className="field-help">No quizzes yet. Create your first quiz above.</p> :
            <ul className="quiz-list">{quizzes.map(quiz => <li key={quiz.id}><button className="quiz-select" aria-pressed={selected?.id === quiz.id} disabled={disabled} onClick={() => openQuiz(quiz.id)}><strong>{quiz.title}</strong><span>{quiz.isPublished ? 'Published' : 'Draft'}</span></button></li>)}</ul>}
        </section>
        {selected ? <section className="quiz-editor" aria-label="Quiz editor">
          <div className="host-section-heading"><h2>Edit quiz</h2><span className="quiz-status">{selected.isPublished ? 'Published' : 'Draft'}</span></div>
          <form className="host-title-form" onSubmit={event => { event.preventDefault(); run(async () => { const clean = validateTitle(title); await requireDraft(); await pb.collection('quizzes').update(selected.id, { title: clean }); const result = await reloadQuiz(selected.id); if (result.quiz.title !== clean) throw new Error('Title could not be verified.'); }, 'Title saved.'); }}>
            <div className="field"><label htmlFor="quiz-title">Quiz title</label><input id="quiz-title" maxLength={100} required value={title} disabled={readOnly || !!draft} onChange={event => setTitle(event.target.value)} /></div>
            <button className="button secondary" disabled={readOnly || !!draft}>Save title</button>
          </form>
          <div className="host-actions"><button className="button secondary" disabled={disabled || !!draft || title !== selected.title} onClick={togglePublish}>{selected.isPublished ? 'Unpublish quiz' : 'Publish quiz'}</button><span className="field-help">{selected.isPublished ? 'Unpublish to change questions or title.' : 'Save title and question changes before publishing.'}</span></div>
          <p className="field-help">Publishing makes this quiz visible. Live games are not implemented yet.</p>
          <div className="host-section-heading"><h2>Questions ({questions.length})</h2><button className="button secondary compact" disabled={readOnly || !!draft} onClick={() => editQuestion(null)}>Add question</button></div>
          {!questions.length && <p className="field-help">Add at least one complete question before publishing.</p>}
          <ol className="question-list">{questions.map((question, index) => <li key={question.id}>
            <div><strong>{question.text}</strong><p className="field-help">{question.options?.length || 0} options · {question.timeLimit} seconds</p></div>
            <div className="host-actions"><button className="text-button" disabled={readOnly || !!draft} onClick={() => editQuestion(question)}>Edit question</button>
              <button className="text-button" disabled={readOnly || !!draft || index === 0} onClick={() => moveQuestion(index, -1)}>Move up</button>
              <button className="text-button" disabled={readOnly || !!draft || index === questions.length - 1} onClick={() => moveQuestion(index, 1)}>Move down</button>
              <button className="text-button danger" disabled={readOnly || !!draft} onClick={() => deleteQuestion(question)}>Delete question</button></div>
          </li>)}</ol>
          {draft && <form className="question-form form-stack" onSubmit={saveQuestion}>
            <h2>{draft.id ? 'Edit question' : 'New question'}</h2>
            <div className="field"><label htmlFor="question-text">Question text</label><textarea id="question-text" required maxLength={300} value={draft.text} disabled={busy} onChange={event => setDraft({ ...draft, text: event.target.value })} /><p className="field-help">{draft.text.length}/300 characters</p></div>
            <fieldset disabled={busy}><legend>Answer options — select the correct answer</legend>
              {draft.options.map((option, index) => <div className="option-row" key={index}>
                <label className="correct-choice"><input id={`correct-${index}`} type="radio" name="correct-answer" checked={draft.correctIndex === index} onChange={() => setDraft({ ...draft, correctIndex: index })} />Correct {index + 1}</label>
                <div className="field"><label htmlFor={`option-${index}`}>Option {index + 1}</label><input id={`option-${index}`} required value={option} onChange={event => setDraft({ ...draft, options: draft.options.map((value, position) => position === index ? event.target.value : value) })} /></div>
                <button type="button" className="text-button" aria-label={`Remove option ${index + 1}`} disabled={draft.options.length <= 2} onClick={() => setDraft({ ...draft, options: draft.options.filter((_, position) => position !== index), correctIndex: draft.correctIndex === index ? null : draft.correctIndex > index ? draft.correctIndex - 1 : draft.correctIndex })}>Remove</button>
              </div>)}
              <button type="button" className="text-button" disabled={draft.options.length >= 4} onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })}>Add option</button>
            </fieldset>
            <div className="field"><label htmlFor="time-limit">Time limit (seconds)</label><input id="time-limit" type="number" min={5} max={300} step={1} required value={draft.timeLimit} disabled={busy} onChange={event => setDraft({ ...draft, timeLimit: event.target.value })} /></div>
            <div className="host-actions"><button className="button primary" disabled={busy}>Save question</button><button type="button" className="button secondary" disabled={busy} onClick={() => setDraft(null)}>Cancel</button></div>
          </form>}
        </section> : <section className="empty-state"><h2>A fresh start</h2><p>Create a quiz or choose one from your library to edit its questions.</p></section>}
      </div>
    </main>
  </PageShell>;
}
