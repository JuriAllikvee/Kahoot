import { useEffect, useRef, useState } from 'react';
import { pb } from '../lib/pocketbase';
import { watchGame, sendGame } from '../lib/gameplay.js';

export default function LobbyPanel({ gameId, session, onReplay }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);

  useEffect(() => {
    setSnapshot(null);
    setError('');
    const stop = watchGame(
      pb,
      gameId,
      session,
      value => {
        setSnapshot({ ...value, receivedAt: Date.now() });
        setError('');
      },
      err => setError(err.message)
    );
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [gameId, session?.playerId, session?.token, attempt]);

  async function run(action, body) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await sendGame(pb, gameId, action, body);
      setAttempt(n => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const status = snapshot?.game.status;
  const seconds = snapshot
    ? Math.max(0, Math.ceil((snapshot.deadline - snapshot.serverNow - (now - snapshot.receivedAt)) / 1000))
    : 0;
  const answer = snapshot?.me?.answer;
  const control = action =>
    run('control', {
      action,
      expectedStatus: status,
      expectedQuestion: snapshot.game.currentQuestion,
    });

  return (
    <section className="form-card session-card" aria-label="Live game">
      <p className="eyebrow">LIVE QUIZ</p>
      {error && (
        <div className="error-message" role="alert">
          {error}{' '}
          <button className="text-button" onClick={() => setAttempt(n => n + 1)}>
            Retry connection
          </button>
        </div>
      )}
      {!snapshot ? (
        <p role="status">Loading game…</p>
      ) : (
        <>
          <h2>
            Game code: <strong className="lobby-code">{snapshot.game.code}</strong>
          </h2>

          {status === 'lobby' && (
            <>
              <p>
                Share this code with players at <a href="/play">/play</a>.
              </p>
              <p role="status">Waiting in the lobby · {snapshot.players.length} players</p>
              {!session && (
                <button className="button primary" disabled={busy} onClick={() => control('start')}>
                  Start game
                </button>
              )}
            </>
          )}

          {status === 'finished' && <h2>Game finished</h2>}

          {snapshot.question && (
            <>
              <p className="eyebrow">
                Question {snapshot.position} of {snapshot.total}
              </p>
              <h2>{snapshot.question.text}</h2>

              {status === 'question' && (
                <p role="timer">
                  {seconds} seconds remaining · {snapshot.answerCount} answers received
                </p>
              )}

              <div className="answer-grid">
                {snapshot.question.options.map((option, index) => (
                  <button
                    key={index}
                    className={`button secondary answer-option ${
                      snapshot.question.correctIndex === index ? 'correct-option' : ''
                    }`}
                    aria-pressed={answer?.optionIndex === index}
                    disabled={
                      busy || !!error || !session || !!answer || status !== 'question' || seconds <= 0
                    }
                    onClick={() =>
                      run('answer', {
                        playerId: session.playerId,
                        token: session.token,
                        question: snapshot.question.id,
                        optionIndex: index,
                      })
                    }
                  >
                    {option}
                    {snapshot.question.correctIndex === index ? ' ✓ Correct' : ''}
                    {snapshot.distribution ? ` — ${snapshot.distribution[index]} votes` : ''}
                  </button>
                ))}
              </div>

              {status === 'question' && answer && (
                <p role="status">Answer received. Waiting for results…</p>
              )}
              {status === 'question' && seconds === 0 && (
                <p role="status">Time is up. Waiting for server results…</p>
              )}
              {(status === 'results' || status === 'finished') && session && (
                <p role="status">
                  {answer
                    ? `${answer.isCorrect ? 'Correct!' : 'Not quite.'} +${answer.points} points`
                    : 'No answer submitted this round.'}
                </p>
              )}

              {!session && status === 'question' && (
                <button className="button primary" disabled={busy} onClick={() => control('results')}>
                  Show results now
                </button>
              )}
              {!session && status === 'results' && (
                <button className="button primary" disabled={busy} onClick={() => control('next')}>
                  {snapshot.position === snapshot.total ? 'Finish game' : 'Next question'}
                </button>
              )}
            </>
          )}

          <h3>{status === 'lobby' ? 'Players' : 'Leaderboard'}</h3>
          {snapshot.players.length ? (
            <ol>
              {snapshot.players.map(player => (
                <li key={player.id}>
                  {player.nickname}
                  {player.id === session?.playerId ? ' (you)' : ''} — {player.score} points
                </li>
              ))}
            </ol>
          ) : (
            <p>No players yet.</p>
          )}

          {!session && status === 'finished' && onReplay && (
            <button className="button primary" disabled={busy} onClick={onReplay}>
              Play again
            </button>
          )}
        </>
      )}
    </section>
  );
}
