import { useState, useEffect, useCallback } from 'react';

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function getOasisHost() {
  return window.OasisHost ?? null;
}

// ── Modes ──────────────────────────────────────────────────────────────────
// 'manage' | 'quiz'

export default function App() {
  const [words, setWords] = useState(loadWords);
  const [mode, setMode] = useState('manage');

  // Manage state
  const [newWord, setNewWord] = useState('');
  const [newDef, setNewDef] = useState('');
  const [editId, setEditId] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editDef, setEditDef] = useState('');

  // Quiz state
  const [quizDeck, setQuizDeck] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState({}); // id -> 'easy'|'hard'

  // AI state
  const [aiSentence, setAiSentence] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Persist words
  useEffect(() => { saveWords(words); }, [words]);

  // ── Manage actions ────────────────────────────────────────────────────────

  const handleAdd = () => {
    const w = newWord.trim();
    const d = newDef.trim();
    if (!w || !d) return;
    const id = Date.now();
    setWords(prev => [...prev, { id, word: w, definition: d }]);
    setNewWord('');
    setNewDef('');
  };

  const handleDelete = (id) => {
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditWord(item.word);
    setEditDef(item.definition);
  };

  const saveEdit = () => {
    const w = editWord.trim();
    const d = editDef.trim();
    if (!w || !d) return;
    setWords(prev => prev.map(item => item.id === editId ? { ...item, word: w, definition: d } : item));
    setEditId(null);
  };

  const cancelEdit = () => setEditId(null);

  // ── Quiz actions ──────────────────────────────────────────────────────────

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

  const handleReveal = () => setRevealed(true);

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

  // ── AI example sentence ───────────────────────────────────────────────────

  const handleAI = useCallback(async () => {
    if (!currentCard) return;
    const host = getOasisHost();
    if (!host) {
      setAiError('OasisHost not available — run this app inside the webAI shell.');
      return;
    }
    setAiLoading(true);
    setAiSentence('');
    setAiError('');
    let sentence = '';
    try {
      const release = await host.acquire({ warmRuntime: true });
      try {
        await host.request(
          `Write one clear, vivid example sentence using the word "${currentCard.word}". Only output the sentence, nothing else.`,
          {
            systemPrompt: 'You are a helpful vocabulary tutor. Respond with exactly one example sentence.',
            maxTokens: 100,
            temperature: 0.8,
            onToken: (tok) => {
              sentence += tok;
              setAiSentence(sentence);
            },
          }
        );
      } finally {
        release();
      }
    } catch (err) {
      setAiError(err?.message ?? 'AI request failed.');
    } finally {
      setAiLoading(false);
    }
  }, [currentCard]);

  // ── Results summary ───────────────────────────────────────────────────────

  const easyCount = Object.values(ratings).filter(r => r === 'easy').length;
  const hardCount = Object.values(ratings).filter(r => r === 'hard').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">Vocab Flashcards</span>
        </div>
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
      </header>

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
            onCancelEdit={cancelEdit}
          />
        )}

        {mode === 'quiz' && currentCard && (
          <QuizView
            card={currentCard}
            index={quizIndex}
            total={quizDeck.length}
            revealed={revealed}
            onReveal={handleReveal}
            onRate={handleRate}
            aiSentence={aiSentence}
            aiLoading={aiLoading}
            aiError={aiError}
            onAI={handleAI}
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
    </div>
  );
}

// ── ManageView ──────────────────────────────────────────────────────────────

function ManageView({
  words, newWord, newDef, setNewWord, setNewDef, onAdd, onDelete,
  editId, editWord, editDef, setEditWord, setEditDef,
  onStartEdit, onSaveEdit, onCancelEdit,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAdd(); }
  };

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
            onKeyDown={handleKeyDown}
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

// ── QuizView ────────────────────────────────────────────────────────────────

function QuizView({ card, index, total, revealed, onReveal, onRate, aiSentence, aiLoading, aiError, onAI }) {
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
            <button className="btn btn-hard" onClick={() => onRate('hard')}>
              Hard
            </button>
            <button className="btn btn-easy" onClick={() => onRate('easy')}>
              Easy
            </button>
          </div>

          <div className="ai-section">
            <button
              className="btn btn-ai"
              onClick={onAI}
              disabled={aiLoading}
            >
              {aiLoading ? 'Generating…' : '✦ AI Example Sentence'}
            </button>
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

// ── ResultsView ─────────────────────────────────────────────────────────────

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
