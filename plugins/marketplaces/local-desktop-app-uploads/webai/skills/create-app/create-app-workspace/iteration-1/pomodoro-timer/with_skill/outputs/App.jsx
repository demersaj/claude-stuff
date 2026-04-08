import { useState, useEffect, useRef, useCallback } from 'react';
import { getOasisHost, getOasisState, streamCompletion, goToLauncher } from './webai.js';

// --- constants ---
const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const TODAY_KEY = 'pomodoro-sessions-' + new Date().toISOString().slice(0, 10);

function loadTodaySessions() {
  try { return parseInt(localStorage.getItem(TODAY_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveTodaySessions(n) {
  try { localStorage.setItem(TODAY_KEY, String(n)); } catch { /* no-op */ }
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
  const [mode, setMode] = useState('work');
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
  const [sessions, setSessions] = useState(loadTodaySessions);
  const [oasisState, setOasisState] = useState('waiting');
  const [encouragement, setEncouragement] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);

  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

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

  // AI encouragement using streamCompletion from webai.js
  const fetchEncouragement = useCallback(async (sessionCount) => {
    setLoadingAi(true);
    setEncouragement('');
    if (!getOasisHost()) {
      const fallbacks = [
        "Great work! Keep up the momentum!",
        "Another session done. You're on a roll!",
        "Excellent focus! Take a well-earned break.",
        "You're making real progress today!",
        "Consistency is key — and you've got it!",
      ];
      setEncouragement(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
      setLoadingAi(false);
      return;
    }
    const prompt = `The user just finished Pomodoro session #${sessionCount} today. Give them a short (1-2 sentences), genuine, and specific encouraging message. Be warm but not over-the-top.`;
    try {
      await streamCompletion(prompt, {
        systemPrompt: 'You are a supportive productivity coach. Be concise and encouraging.',
        maxTokens: 80,
        temperature: 0.8,
        onToken: (tok) => setEncouragement(prev => prev + tok),
      });
    } catch {
      setEncouragement("Great session! Take a moment to recharge.");
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
      await fetchEncouragement(newCount);
    }
  }, [mode, sessions, fetchEncouragement]);

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
    setSecondsLeft(mode === 'work' ? WORK_SECONDS : BREAK_SECONDS);
    setShowEncouragement(false);
  }
  function switchMode(newMode) {
    setRunning(false);
    setMode(newMode);
    setSecondsLeft(newMode === 'work' ? WORK_SECONDS : BREAK_SECONDS);
    setShowEncouragement(false);
  }

  const total = mode === 'work' ? WORK_SECONDS : BREAK_SECONDS;
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

      {/* AI encouragement panel */}
      {(showEncouragement || loadingAi) && (
        <div style={{
          maxWidth: 320, padding: '16px 20px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)',
          textAlign: 'center', fontSize: 14, lineHeight: 1.5,
          color: 'rgba(255,255,255,0.85)',
          animation: 'fadeIn 0.4s ease',
        }}>
          {loadingAi ? (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Getting your encouragement…</span>
          ) : (
            <><span style={{ fontSize: 20 }}>✨ </span>{encouragement}</>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
