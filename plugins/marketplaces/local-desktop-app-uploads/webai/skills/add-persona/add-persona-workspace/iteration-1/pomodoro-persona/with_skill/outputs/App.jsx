import { useState, useEffect, useRef, useCallback } from 'react';
import { getOasisHost, getOasisState, streamCompletion, goToLauncher } from './webai.js';

// --- constants ---
const TODAY_KEY = 'pomodoro-sessions-' + new Date().toISOString().slice(0, 10);
const PERSONA_KEY = 'pomodoro-persona';

// --- persona definitions ---
const PERSONAS = [
  {
    id: 'motivational',
    label: 'Motivational',
    icon: '🌟',
    tagline: 'Warm, uplifting energy',
    systemPrompt: 'You are an enthusiastic and warm productivity coach. Celebrate the user\'s effort with genuine excitement. Be uplifting, positive, and specific. Use vibrant but not overwhelming language.',
    buildPrompt: (count) =>
      `The user just finished Pomodoro session #${count} today! Give them an enthusiastic, warm, and genuinely uplifting message (1-2 sentences). Celebrate their effort and momentum.`,
    fallbacks: [
      "You're absolutely crushing it! Every session builds unstoppable momentum.",
      "Another session done — you're on fire! Keep riding this wave of focus.",
      "Incredible work! You're proving to yourself what deep focus can achieve.",
      "You did it! Each session is a brick in the foundation of something great.",
      "That's the spirit! You're building real discipline one session at a time.",
    ],
    accentColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.35)',
  },
  {
    id: 'strict',
    label: 'Strict',
    icon: '⚡',
    tagline: 'No-nonsense, results-driven',
    systemPrompt: 'You are a no-nonsense, results-driven productivity coach. Acknowledge the completed session briefly, then immediately redirect to what\'s next. Be direct, efficient, and high-standard. No fluff.',
    buildPrompt: (count) =>
      `The user just finished Pomodoro session #${count} today. Acknowledge it briefly, then push them to keep the standard high. Be direct and sharp (1-2 sentences). No fluff.`,
    fallbacks: [
      "Session logged. Don't lose the momentum — reset and go again.",
      "Done. Good. Now take your break efficiently and get back to work.",
      "Session complete. The work isn't going to do itself — stay focused.",
      "Noted. Rest is part of the process. Use your break, then continue.",
      "That's the baseline. Now raise your standard for the next one.",
    ],
    accentColor: '#818cf8',
    glowColor: 'rgba(129,140,248,0.35)',
  },
];

function loadTodaySessions() {
  try { return parseInt(localStorage.getItem(TODAY_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveTodaySessions(n) {
  try { localStorage.setItem(TODAY_KEY, String(n)); } catch { /* no-op */ }
}
function loadSavedPersonaId() {
  try { return localStorage.getItem(PERSONA_KEY) ?? null; } catch { return null; }
}
function savePersonaId(id) {
  try { localStorage.setItem(PERSONA_KEY, id); } catch { /* no-op */ }
}
function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

// --- SVG ring ---
function TimerRing({ progress, mode }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const color = mode === 'work' ? '#e05c5c' : '#4ade80';
  return (
    <svg width="220" height="220" style={{ display: 'block' }}>
      <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
      <circle
        cx="110" cy="110" r={radius}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 110 110)"
        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.4s ease' }}
      />
    </svg>
  );
}

// --- persona card ---
function PersonaCard({ persona, selected, onSelect }) {
  const isSelected = selected === persona.id;
  return (
    <button
      onClick={() => onSelect(persona.id)}
      style={{
        flex: 1,
        minWidth: 120,
        padding: '12px 10px',
        borderRadius: 14,
        border: isSelected
          ? `2px solid ${persona.accentColor}`
          : '2px solid rgba(255,255,255,0.1)',
        background: isSelected
          ? `radial-gradient(ellipse at top, ${persona.glowColor} 0%, rgba(255,255,255,0.06) 100%)`
          : 'rgba(255,255,255,0.05)',
        color: '#fff',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? `0 0 16px ${persona.glowColor}` : 'none',
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 5 }}>{persona.icon}</div>
      <div style={{
        fontSize: 12, fontWeight: 700, marginBottom: 2,
        color: isSelected ? persona.accentColor : 'rgba(255,255,255,0.9)',
      }}>
        {persona.label}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.35 }}>
        {persona.tagline}
      </div>
      {isSelected && (
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: persona.accentColor,
          margin: '7px auto 0',
          boxShadow: `0 0 6px ${persona.accentColor}`,
        }} />
      )}
    </button>
  );
}

// --- persona picker panel ---
function PersonaPicker({ selectedId, onSelect }) {
  return (
    <div style={{ width: '100%', maxWidth: 320, marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
        color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 8,
      }}>
        COACHING STYLE
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {PERSONAS.map(p => (
          <PersonaCard key={p.id} persona={p} selected={selectedId} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// --- session dots ---
function SessionDots({ count }) {
  const dots = Array.from({ length: Math.min(count, 12) }, (_, i) => i);
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 200 }}>
      {dots.map(i => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#e05c5c', boxShadow: '0 0 4px rgba(224,92,92,0.6)' }} />
      ))}
      {count > 12 && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>+{count - 12}</span>}
    </div>
  );
}

export default function App() {
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [draftWork, setDraftWork] = useState(25);
  const [draftBreak, setDraftBreak] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  const [mode, setMode] = useState('work');
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [sessions, setSessions] = useState(loadTodaySessions);
  const [oasisState, setOasisState] = useState('waiting');
  const [encouragement, setEncouragement] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [personaId, setPersonaId] = useState(() => loadSavedPersonaId() ?? 'motivational');

  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  const activePersona = PERSONAS.find(p => p.id === personaId) ?? PERSONAS[0];

  // Oasis state polling (status badge)
  useEffect(() => {
    const id = setInterval(() => setOasisState(getOasisState()), 1200);
    setOasisState(getOasisState());
    return () => clearInterval(id);
  }, []);

  // Update page title
  useEffect(() => {
    document.title = `${formatTime(secondsLeft)} — ${mode === 'work' ? 'Focus' : 'Break'} | Pomodoro`;
  }, [secondsLeft, mode]);

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // AI encouragement using streamCompletion from webai.js, routed through active persona
  const fetchEncouragement = useCallback(async (sessionCount, persona) => {
    setLoadingAi(true);
    setEncouragement('');
    if (!getOasisHost()) {
      const fallback = persona.fallbacks[Math.floor(Math.random() * persona.fallbacks.length)];
      setEncouragement(fallback);
      setLoadingAi(false);
      return;
    }
    const prompt = persona.buildPrompt(sessionCount);
    try {
      await streamCompletion(prompt, {
        systemPrompt: persona.systemPrompt,
        maxTokens: 80,
        temperature: 0.85,
        personaType: persona.id,
        onToken: (tok) => setEncouragement(prev => prev + tok),
      });
    } catch {
      const fallback = persona.fallbacks[Math.floor(Math.random() * persona.fallbacks.length)];
      setEncouragement(fallback);
    } finally {
      setLoadingAi(false);
    }
  }, []);

  const handleSessionComplete = useCallback(async () => {
    setRunning(false);
    playBell();
    if (mode === 'work') {
      const newCount = sessions + 1;
      setSessions(newCount);
      saveTodaySessions(newCount);
      setShowEncouragement(true);
      await fetchEncouragement(newCount, activePersona);
    }
  }, [mode, sessions, fetchEncouragement, activePersona]);

  function handleSelectPersona(id) {
    setPersonaId(id);
    savePersonaId(id);
    setShowEncouragement(false);
  }

  useEffect(() => {
    if (secondsLeft === 0) handleSessionComplete();
  }, [secondsLeft, handleSessionComplete]);

  function playBell() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 830; osc.type = 'sine';
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(); osc.stop(ctx.currentTime + 1.2);
    } catch { /* audio not available */ }
  }

  function handleStart() { setRunning(true); setShowEncouragement(false); }
  function handlePause() { setRunning(false); }
  function handleReset() {
    setRunning(false);
    setSecondsLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60);
    setShowEncouragement(false);
  }
  function switchMode(newMode) {
    setRunning(false);
    setMode(newMode);
    setSecondsLeft(newMode === 'work' ? workMinutes * 60 : breakMinutes * 60);
    setShowEncouragement(false);
  }
  function handleOpenSettings() {
    setDraftWork(workMinutes);
    setDraftBreak(breakMinutes);
    setShowSettings(true);
  }
  function handleSaveSettings() {
    const w = Math.max(1, Math.min(120, parseInt(draftWork, 10) || workMinutes));
    const b = Math.max(1, Math.min(60, parseInt(draftBreak, 10) || breakMinutes));
    setWorkMinutes(w);
    setBreakMinutes(b);
    setRunning(false);
    setSecondsLeft(mode === 'work' ? w * 60 : b * 60);
    setShowEncouragement(false);
    setShowSettings(false);
  }

  const total = mode === 'work' ? workMinutes * 60 : breakMinutes * 60;
  const progress = secondsLeft / total;
  const isDevMode = !getOasisHost();

  const statusLabel = oasisState === 'ready' ? '● ready' : oasisState === 'loading' ? '◌ loading…' : '○ waiting';
  const statusColor = oasisState === 'ready' ? '#4ade80' : oasisState === 'loading' ? '#f59e0b' : '#9ca3af';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#fff',
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      {/* Header bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.2)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>🍅 Pomodoro Timer</span>
        <span style={{ fontSize: 12, color: statusColor }}>{statusLabel}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleOpenSettings}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)',
              borderRadius: 6, cursor: 'pointer', fontSize: 14, padding: '4px 10px',
            }}
            title="Settings"
          >⚙</button>
          <button
            onClick={goToLauncher}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)',
              borderRadius: 6, cursor: 'pointer', fontSize: 12, padding: '4px 10px',
            }}
          >
            ← Launcher
          </button>
        </div>
      </div>

      {/* Dev mode notice */}
      {isDevMode && (
        <div style={{
          position: 'absolute', top: 45, left: 0, right: 0,
          background: 'rgba(253,186,14,0.15)', color: '#fbbf24',
          fontSize: 12, padding: '5px 16px', textAlign: 'center',
          borderBottom: '1px solid rgba(253,186,14,0.2)',
        }}>
          Running outside Apogee — AI features disabled
        </div>
      )}

      {/* Mode tabs */}
      <div style={{ display: 'flex', marginBottom: 32, background: 'rgba(255,255,255,0.08)', borderRadius: 30, padding: 4 }}>
        {['work', 'break'].map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              padding: '8px 20px', borderRadius: 26, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13, letterSpacing: 0.5, transition: 'all 0.2s ease',
              background: mode === m ? (m === 'work' ? '#e05c5c' : '#4ade80') : 'transparent',
              color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)',
              boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {m === 'work' ? 'Focus' : 'Break'}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <TimerRing progress={progress} mode={mode} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>
            {formatTime(secondsLeft)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4, letterSpacing: 1 }}>
            {mode === 'work' ? 'FOCUS TIME' : 'BREAK TIME'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, alignItems: 'center' }}>
        <button
          onClick={handleReset}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)',
            borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Reset"
        >↺</button>
        <button
          onClick={running ? handlePause : handleStart}
          style={{
            background: mode === 'work' ? '#e05c5c' : '#4ade80',
            border: 'none', color: '#fff', borderRadius: '50%', width: 64, height: 64,
            cursor: 'pointer', fontSize: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 20px ${mode === 'work' ? 'rgba(224,92,92,0.4)' : 'rgba(74,222,128,0.4)'}`,
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {running ? '⏸' : '▶'}
        </button>
        <div style={{ width: 44 }} />
      </div>

      {/* Sessions today */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8 }}>
          TODAY&apos;S SESSIONS
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{sessions}</div>
        {sessions > 0 && <SessionDots count={sessions} />}
      </div>

      {/* Persona picker */}
      <PersonaPicker selectedId={personaId} onSelect={handleSelectPersona} />

      {/* AI encouragement panel */}
      {(showEncouragement || loadingAi) && (
        <div style={{
          maxWidth: 320, padding: '16px 20px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 16,
          border: `1px solid ${activePersona.accentColor}55`,
          textAlign: 'center', fontSize: 14, lineHeight: 1.5,
          color: 'rgba(255,255,255,0.85)',
          animation: 'fadeIn 0.4s ease',
          boxShadow: `0 0 20px ${activePersona.glowColor}`,
        }}>
          {loadingAi ? (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              {activePersona.icon} Getting your {activePersona.label.toLowerCase()} encouragement…
            </span>
          ) : (
            <><span style={{ fontSize: 20 }}>{activePersona.icon} </span>{encouragement}</>
          )}
        </div>
      )}

      {/* Settings panel overlay */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: '#1e2640',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '28px 32px',
            minWidth: 280,
            display: 'flex', flexDirection: 'column', gap: 20,
            animation: 'fadeIn 0.25s ease',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center' }}>Timer Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                <span>Focus length (min)</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={draftWork}
                  onChange={e => setDraftWork(e.target.value)}
                  style={{
                    width: 64, padding: '6px 10px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)', color: '#fff',
                    fontSize: 15, textAlign: 'center', outline: 'none',
                  }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                <span>Break length (min)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={draftBreak}
                  onChange={e => setDraftBreak(e.target.value)}
                  style={{
                    width: 64, padding: '6px 10px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)', color: '#fff',
                    fontSize: 15, textAlign: 'center', outline: 'none',
                  }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent', color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                }}
              >Cancel</button>
              <button
                onClick={handleSaveSettings}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  border: 'none',
                  background: '#e05c5c', color: '#fff',
                  cursor: 'pointer', fontSize: 14, fontWeight: 700,
                }}
              >Save</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 0.5; }
      `}</style>
    </div>
  );
}
