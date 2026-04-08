import { useState, useEffect, useCallback } from 'react';
import { getOasisState, getOasisHost, streamCompletion, goToLauncher } from './webai.js';

// ── Persistent storage ────────────────────────────────────────────────────────

const STORAGE_KEY = 'vocab-flashcards-words';

const DEFAULT_WORDS = [
  { id: 1, word: 'Ephemeral', definition: 'Lasting for a very short time; transitory.' },
  { id: 2, word: 'Sanguine', definition: 'Optimistic or positive, especially in a difficult situation.' },
  { id: 3, word: 'Perspicacious', definition: 'Having a ready insight into things; shrewd.' },
];

function loadWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_WORDS;
}

function saveWords(words) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(words)); } catch {}
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ state }) {
  const configs = {
    ready:   { dot: '●', label: 'ready',    color: '#16a34a' },
    loading: { dot: '◌', label: 'loading…', color: '#d97706' },
    waiting: { dot: '○', label: 'waiting',  color: '#6b7280' },
  };
  const { dot, label, color } = configs[state] ?? configs.waiting;
  return (
    <span style={{ fontSize: '0.75rem', color, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
      {dot} {label}
    </span>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

// Modes: 'manage' | 'quiz' | 'results'

export default function App() {
  const [words, setWords]     = useState(loadWords);
  const [mode, setMode]       = useState('manage');
  const [oasisState, setOasisState] = useState('waiting');

  // Manage state
  const [newWord, setNewWord] = useState('');
  const [newDef,  setNewDef]  = useState('');
  const [editId,  setEditId]  = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editDef,  setEditDef]  = useState('');

  // Quiz state
  const [quizDeck,  setQuizDeck]  = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [revealed,  setRevealed]  = useState(false);
  const [ratings,   setRatings]   = useState({});  // id -> 'easy'|'hard'

  // AI state
  const [aiSentence, setAiSentence] = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState('');

  // Oasis state polling (required by skill spec)
  useEffect(() => {
    const id = setInterval(() => setOasisState(getOasisState()), 1200);
    setOasisState(getOasisState());
    return () => clearInterval(id);
  }, []);

  // Persist words
  useEffect(() => { saveWords(words); }, [words]);

  // ── Manage actions ──────────────────────────────────────────────────────────

  const handleAdd = () => {
    const w = newWord.trim();
    const d = newDef.trim();
    if (!w || !d) return;
    setWords(prev => [...prev, { id: Date.now(), word: w, definition: d }]);
    setNewWord('');
    setNewDef('');
  };

  const handleDelete = (id) => setWords(prev => prev.filter(w => w.id !== id));

  const startEdit = (item) => {
    setEditId(item.id);
    setEditWord(item.word);
    setEditDef(item.definition);
  };

  const saveEdit = () => {
    const w = editWord.trim();
    const d = editDef.trim();
    if (!w || !d) return;
    setWords(prev => prev.map(item =>
      item.id === editId ? { ...item, word: w, definition: d } : item
    ));
    setEditId(null);
  };

  // ── Quiz actions ────────────────────────────────────────────────────────────

  const startQuiz = () => {
    if (words.length === 0) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setQuizDeck(shuffled);
    setQuizIndex(0);
    setRevealed(false);
    setRatings({});
    setAiSentence('');
    setAiError('');
    setMode('quiz');
  };

  const currentCard = quizDeck[quizIndex] ?? null;

  const handleRate = (rating) => {
    if (!currentCard) return;
    setRatings(prev => ({ ...prev, [currentCard.id]: rating }));
    const next = quizIndex + 1;
    if (next < quizDeck.length) {
      setQuizIndex(next);
      setRevealed(false);
      setAiSentence('');
      setAiError('');
    } else {
      setMode('results');
    }
  };

  // ── AI example sentence ─────────────────────────────────────────────────────

  const handleAI = useCallback(async () => {
    if (!currentCard) return;
    setAiLoading(true);
    setAiSentence('');
    setAiError('');
    try {
      await streamCompletion(
        `Write one clear, vivid example sentence using the word "${currentCard.word}" (meaning: ${currentCard.definition}). Output only the sentence, nothing else.`,
        {
          systemPrompt: 'You are a vocabulary tutor. Write a single memorable example sentence that demonstrates the word\'s meaning in context.',
          maxTokens: 120,
          temperature: 0.8,
          onToken: (tok) => setAiSentence(prev => prev + tok),
        }
      );
    } catch (err) {
      setAiError(err?.message ?? 'AI request failed.');
    } finally {
      setAiLoading(false);
    }
  }, [currentCard]);

  // ── Results summary ─────────────────────────────────────────────────────────

  const easyCount = Object.values(ratings).filter(r => r === 'easy').length;
  const hardCount = Object.values(ratings).filter(r => r === 'hard').length;
  const noShell = !getOasisHost();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* ── Header (required by skill) ── */}
      <header className="header">
        <div className="header-logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">Vocab Flashcards</span>
        </div>
        <div className="header-right">
          <StatusBadge state={oasisState} />
          <nav className="header-nav">
            <button
              className={`nav-btn${mode === 'manage' ? ' active' : ''}`}
              onClick={() => setMode('manage')}
            >
              My Words
            </button>
            <button
              className="nav-btn quiz-btn"
              onClick={startQuiz}
              disabled={words.length === 0}
              title={words.length === 0 ? 'Add words first' : 'Start quiz'}
            >
              Quiz Mode
            </button>
          </nav>
          <button className="launcher-btn" onClick={goToLauncher}>← Launcher</button>
        </div>
      </header>

      {/* ── Dev mode notice (required by skill) ── */}
      {noShell && (
        <div className="dev-banner">
          Running outside Apogee — AI features disabled
        </div>
      )}

      {/* ── Main content ── */}
      <main className="main">
        {mode === 'manage' && (
          <ManageView
            words={words}
            newWord={newWord}
            newDef={newDef}
            setNewWord={setNewWord}
            setNewDef={setNewDef}
            onAdd={handleAdd}
            onDelete={handleDelete}
            editId={editId}
            editWord={editWord}
            editDef={editDef}
            setEditWord={setEditWord}
            setEditDef={setEditDef}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditId(null)}
          />
        )}

        {mode === 'quiz' && currentCard && (
          <QuizView
            card={currentCard}
            index={quizIndex}
            total={quizDeck.length}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onRate={handleRate}
            aiSentence={aiSentence}
            aiLoading={aiLoading}
            aiError={aiError}
            onAI={handleAI}
            hasAI={!noShell}
          />
        )}

        {mode === 'results' && (
          <ResultsView
            total={quizDeck.length}
            easyCount={easyCount}
            hardCount={hardCount}
            deck={quizDeck}
            ratings={ratings}
            onRestart={startQuiz}
            onManage={() => setMode('manage')}
          />
        )}
      </main>

      <style>{CSS}</style>
    </div>
  );
}

// ── ManageView ────────────────────────────────────────────────────────────────

function ManageView({
  words, newWord, newDef, setNewWord, setNewDef, onAdd, onDelete,
  editId, editWord, editDef, setEditWord, setEditDef,
  onStartEdit, onSaveEdit, onCancelEdit,
}) {
  return (
    <div className="manage-view">
      <section className="add-section">
        <h2 className="section-title">Add a Word</h2>
        <div className="add-form">
          <input
            className="input"
            placeholder="Word or phrase"
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAdd(); } }}
          />
          <textarea
            className="input textarea"
            placeholder="Definition"
            value={newDef}
            onChange={e => setNewDef(e.target.value)}
            rows={2}
          />
          <button className="btn btn-primary" onClick={onAdd} disabled={!newWord.trim() || !newDef.trim()}>
            Add Word
          </button>
        </div>
      </section>

      <section className="word-list-section">
        <h2 className="section-title">
          Your Words <span className="word-count">({words.length})</span>
        </h2>
        {words.length === 0 && (
          <p className="empty-state">No words yet. Add some above to get started!</p>
        )}
        <ul className="word-list">
          {words.map(item => (
            <li key={item.id} className="word-item">
              {editId === item.id ? (
                <div className="edit-form">
                  <input
                    className="input"
                    value={editWord}
                    onChange={e => setEditWord(e.target.value)}
                  />
                  <textarea
                    className="input textarea"
                    value={editDef}
                    onChange={e => setEditDef(e.target.value)}
                    rows={2}
                  />
                  <div className="edit-actions">
                    <button className="btn btn-primary btn-sm" onClick={onSaveEdit}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={onCancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="word-content">
                    <span className="word-term">{item.word}</span>
                    <span className="word-def">{item.definition}</span>
                  </div>
                  <div className="word-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => onStartEdit(item)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Delete</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ── QuizView ──────────────────────────────────────────────────────────────────

function QuizView({ card, index, total, revealed, onReveal, onRate, aiSentence, aiLoading, aiError, onAI, hasAI }) {
  return (
    <div className="quiz-view">
      <div className="quiz-progress">
        <span className="quiz-counter">Card {index + 1} of {total}</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div className={`flashcard${revealed ? ' revealed' : ''}`} onClick={!revealed ? onReveal : undefined}>
        <div className="card-inner">
          <div className="card-front">
            <div className="card-label">Word</div>
            <div className="card-word">{card.word}</div>
            {!revealed && <div className="card-hint">Click to reveal definition</div>}
          </div>
          {revealed && (
            <div className="card-back">
              <div className="card-label">Definition</div>
              <div className="card-definition">{card.definition}</div>
            </div>
          )}
        </div>
      </div>

      {revealed && (
        <div className="quiz-actions">
          <div className="rate-row">
            <button className="btn btn-hard" onClick={() => onRate('hard')}>😓 Hard</button>
            <button className="btn btn-easy" onClick={() => onRate('easy')}>😊 Easy</button>
          </div>

          <div className="ai-section">
            <button
              className="btn btn-ai"
              onClick={onAI}
              disabled={aiLoading || !hasAI}
              title={!hasAI ? 'Requires Apogee shell with AI loaded' : undefined}
            >
              {aiLoading ? '◌ Generating…' : '✦ AI Example Sentence'}
            </button>
            {!hasAI && (
              <div className="ai-notice">AI unavailable outside Apogee shell</div>
            )}
            {aiSentence && (
              <div className="ai-sentence">
                <span className="ai-label">Example:</span> {aiSentence}
              </div>
            )}
            {aiError && <div className="ai-error">{aiError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ResultsView ───────────────────────────────────────────────────────────────

function ResultsView({ total, easyCount, hardCount, deck, ratings, onRestart, onManage }) {
  return (
    <div className="results-view">
      <div className="results-hero">
        <div className="results-icon">🎉</div>
        <h2 className="results-title">Quiz Complete!</h2>
        <p className="results-subtitle">You reviewed {total} word{total !== 1 ? 's' : ''}.</p>
      </div>

      <div className="results-stats">
        <div className="stat stat-easy">
          <span className="stat-number">{easyCount}</span>
          <span className="stat-label">Easy</span>
        </div>
        <div className="stat stat-hard">
          <span className="stat-number">{hardCount}</span>
          <span className="stat-label">Hard</span>
        </div>
      </div>

      {hardCount > 0 && (
        <div className="hard-list">
          <h3 className="hard-list-title">Words to review:</h3>
          <ul>
            {deck.filter(c => ratings[c.id] === 'hard').map(c => (
              <li key={c.id} className="hard-list-item">
                <span className="hard-word">{c.word}</span>
                <span className="hard-def">{c.definition}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="results-actions">
        <button className="btn btn-primary" onClick={onRestart}>Quiz Again</button>
        <button className="btn btn-ghost" onClick={onManage}>Manage Words</button>
      </div>
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #f8f9fa;
    --surface: #ffffff;
    --surface2: #f0f2f5;
    --text: #1a1a2e;
    --text-muted: #6b7280;
    --accent: #2563eb;
    --easy: #16a34a;
    --hard: #dc2626;
    --border: #e5e7eb;
    --shadow: 0 2px 8px rgba(0,0,0,0.08);
    --radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --surface2: #232736;
      --text: #f0f2f8;
      --text-muted: #9ca3af;
      --border: #2d3148;
      --shadow: 0 2px 12px rgba(0,0,0,0.4);
    }
  }

  body { background: var(--bg); color: var(--text); min-height: 100vh; }

  .app { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }

  /* Header */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 1.25rem; height: 52px;
    background: var(--surface); border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow); position: sticky; top: 0; z-index: 10;
  }
  .header-logo { display: flex; align-items: center; gap: 8px; }
  .logo-icon { font-size: 1.2rem; }
  .logo-text { font-weight: 700; font-size: 1rem; color: var(--text); }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .header-nav { display: flex; gap: 4px; }
  .nav-btn {
    background: none; border: 1px solid var(--border); border-radius: 6px;
    padding: 5px 12px; font-size: 0.82rem; cursor: pointer; color: var(--text-muted);
    transition: all 0.15s;
  }
  .nav-btn.active, .nav-btn:hover:not(:disabled) { background: var(--accent); color: #fff; border-color: var(--accent); }
  .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .quiz-btn { background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 600; }
  .quiz-btn:hover:not(:disabled) { opacity: 0.88; }
  .launcher-btn {
    background: none; border: 1px solid var(--border); border-radius: 6px;
    padding: 4px 10px; font-size: 0.78rem; cursor: pointer; color: var(--text-muted);
  }
  .launcher-btn:hover { color: var(--text); }

  /* Dev banner */
  .dev-banner {
    background: #fef3c7; color: #92400e;
    text-align: center; font-size: 0.8rem;
    padding: 6px; border-bottom: 1px solid #fde68a;
  }

  /* Main */
  .main { flex: 1; padding: 1.5rem 1.25rem; max-width: 760px; width: 100%; margin: 0 auto; }

  /* Manage view */
  .manage-view { display: flex; flex-direction: column; gap: 2rem; }
  .section-title { font-size: 1rem; font-weight: 700; color: var(--text); margin-bottom: 0.75rem; }
  .word-count { color: var(--text-muted); font-weight: 400; }
  .add-form { display: flex; flex-direction: column; gap: 0.6rem; max-width: 500px; }
  .input {
    width: 100%; padding: 0.55rem 0.8rem;
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-size: 0.95rem; outline: none; font-family: inherit;
  }
  .input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
  .textarea { resize: vertical; min-height: 64px; }
  .word-list { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
  .word-item {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; box-shadow: var(--shadow);
  }
  .word-content { flex: 1; min-width: 0; }
  .word-term { display: block; font-weight: 700; font-size: 1rem; color: var(--text); }
  .word-def { display: block; font-size: 0.85rem; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .word-actions { display: flex; gap: 6px; flex-shrink: 0; }
  .edit-form { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
  .edit-actions { display: flex; gap: 6px; }
  .empty-state { color: var(--text-muted); font-size: 0.9rem; padding: 1.5rem 0; }

  /* Buttons */
  .btn {
    border: none; border-radius: 8px; padding: 0.5rem 1.1rem;
    font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
  }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover:not(:disabled) { opacity: 0.88; }
  .btn-ghost { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .btn-danger { background: none; border: 1px solid #fca5a5; color: var(--hard); }
  .btn-danger:hover { background: #fef2f2; }
  .btn-sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }
  .btn-easy { background: var(--easy); color: #fff; padding: 0.7rem 2.2rem; font-size: 1rem; border-radius: 10px; }
  .btn-hard { background: var(--hard); color: #fff; padding: 0.7rem 2.2rem; font-size: 1rem; border-radius: 10px; }
  .btn-ai {
    background: linear-gradient(135deg, #6366f1, #2563eb); color: #fff;
    border: none; border-radius: 8px; padding: 0.5rem 1.2rem;
    font-size: 0.9rem; font-weight: 600; cursor: pointer;
  }
  .btn-ai:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Quiz view */
  .quiz-view { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
  .quiz-progress { width: 100%; }
  .quiz-counter { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 6px; display: block; }
  .progress-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.3s ease; }

  .flashcard {
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 2.5rem 2rem; min-height: 200px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: var(--shadow); transition: box-shadow 0.15s, transform 0.15s;
    user-select: none;
  }
  .flashcard:not(.revealed):hover { box-shadow: 0 6px 24px rgba(0,0,0,0.12); transform: translateY(-2px); }
  .flashcard.revealed { cursor: default; }
  .card-inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1rem; width: 100%; }
  .card-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); font-weight: 600; }
  .card-word { font-size: 2rem; font-weight: 800; color: var(--text); }
  .card-hint { font-size: 0.88rem; color: var(--text-muted); font-style: italic; }
  .card-back { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding-top: 1rem; border-top: 2px solid var(--border); width: 100%; }
  .card-definition { font-size: 1.1rem; color: var(--text); line-height: 1.5; }

  .quiz-actions { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; width: 100%; }
  .rate-row { display: flex; gap: 1rem; }

  /* AI section */
  .ai-section {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1rem;
    display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;
  }
  .ai-notice { font-size: 0.78rem; color: var(--text-muted); }
  .ai-sentence { font-size: 0.95rem; color: var(--text); line-height: 1.5; font-style: italic; }
  .ai-label { font-weight: 700; font-style: normal; color: var(--text-muted); font-size: 0.8rem; }
  .ai-error { font-size: 0.85rem; color: var(--hard); }

  /* Results */
  .results-view { display: flex; flex-direction: column; align-items: center; gap: 2rem; padding-top: 1rem; }
  .results-hero { text-align: center; }
  .results-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  .results-title { font-size: 1.6rem; font-weight: 800; color: var(--text); }
  .results-subtitle { color: var(--text-muted); margin-top: 0.25rem; }
  .results-stats { display: flex; gap: 2rem; }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .stat-number { font-size: 2.5rem; font-weight: 800; }
  .stat-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .stat-easy .stat-number { color: var(--easy); }
  .stat-hard .stat-number { color: var(--hard); }
  .hard-list { width: 100%; max-width: 500px; }
  .hard-list-title { font-size: 0.9rem; font-weight: 700; color: var(--text); margin-bottom: 0.75rem; }
  .hard-list-item { display: flex; flex-direction: column; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
  .hard-word { font-weight: 700; font-size: 1rem; color: var(--text); }
  .hard-def { font-size: 0.85rem; color: var(--text-muted); margin-top: 2px; }
  .results-actions { display: flex; gap: 0.75rem; }
`;
