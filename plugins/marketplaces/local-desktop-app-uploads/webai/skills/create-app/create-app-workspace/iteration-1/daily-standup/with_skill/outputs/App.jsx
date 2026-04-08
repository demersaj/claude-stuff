import { useState, useEffect, useCallback } from 'react';
import { getOasisHost, getOasisState, streamCompletion, goToLauncher } from './webai.js';

const SYSTEM_PROMPT = `You are a helpful assistant that formats daily standup meeting updates.
Given raw notes about what someone did yesterday, what they're doing today, and any blockers,
rewrite them in a clear, concise standup format. Use bullet points under each section.
Keep it professional, brief, and scannable. Format output exactly as:

**Yesterday**
• [item]

**Today**
• [item]

**Blockers**
• [item or "None"]

Do not add any preamble or closing remarks — just the formatted standup.`;

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #ffffff;
    --surface: #f4f4f5;
    --surface2: #e4e4e7;
    --text: #18181b;
    --text-muted: #71717a;
    --accent: #2563eb;
    --accent-hover: #1d4ed8;
    --success: #16a34a;
    --warning: #d97706;
    --radius: 10px;
    --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #09090b;
      --surface: #18181b;
      --surface2: #27272a;
      --text: #fafafa;
      --text-muted: #a1a1aa;
      --shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
    }
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--surface2);
    gap: 12px;
    flex-shrink: 0;
  }

  .header-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--text-muted);
    flex: 1;
    justify-content: center;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.ready { background: var(--success); }
  .status-dot.loading { background: var(--warning); animation: pulse 1s ease-in-out infinite; }
  .status-dot.waiting { background: var(--text-muted); }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .btn-launcher {
    background: none;
    border: 1px solid var(--surface2);
    border-radius: 6px;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 12px;
    padding: 4px 10px;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .btn-launcher:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .dev-banner {
    background: #fef3c7;
    border-bottom: 1px solid #fde68a;
    color: #92400e;
    font-size: 12px;
    padding: 6px 16px;
    text-align: center;
  }

  @media (prefers-color-scheme: dark) {
    .dev-banner {
      background: #1c1400;
      border-bottom-color: #3d2c00;
      color: #fbbf24;
    }
  }

  .main {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 20px 16px;
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
  }

  .field-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .field-group {
    margin-bottom: 16px;
  }

  textarea {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--surface2);
    border-radius: var(--radius);
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    line-height: 1.6;
    padding: 10px 12px;
    resize: vertical;
    transition: border-color 0.15s;
    min-height: 80px;
  }

  textarea:focus {
    border-color: var(--accent);
    outline: none;
  }

  textarea::placeholder {
    color: var(--text-muted);
    opacity: 0.7;
  }

  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .btn-generate {
    background: var(--accent);
    border: none;
    border-radius: var(--radius);
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 20px;
    transition: background 0.15s, opacity 0.15s;
    flex-shrink: 0;
  }

  .btn-generate:hover:not(:disabled) { background: var(--accent-hover); }
  .btn-generate:disabled { opacity: 0.55; cursor: not-allowed; }

  .btn-clear {
    background: none;
    border: 1px solid var(--surface2);
    border-radius: var(--radius);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 14px;
    padding: 10px 16px;
    transition: color 0.15s, border-color 0.15s;
  }

  .btn-clear:hover { color: var(--text); border-color: var(--text-muted); }

  .generating-label {
    font-size: 13px;
    color: var(--text-muted);
    font-style: italic;
  }

  .output-panel {
    background: var(--surface);
    border: 1px solid var(--surface2);
    border-radius: var(--radius);
    padding: 16px;
    box-shadow: var(--shadow);
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    gap: 10px;
  }

  .output-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .btn-copy {
    background: none;
    border: 1px solid var(--surface2);
    border-radius: 6px;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 12px;
    padding: 4px 12px;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .btn-copy:hover { color: var(--text); border-color: var(--accent); }
  .btn-copy.copied { color: var(--success); border-color: var(--success); }

  .output-text {
    color: var(--text);
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .output-text strong {
    font-weight: 700;
  }

  .cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background: var(--accent);
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

function renderOutput(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <div key={i} dangerouslySetInnerHTML={{ __html: boldLine || '\u00a0' }} />;
  });
}

export default function App() {
  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [blockers, setBlockers] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [oasisState, setOasisState] = useState('waiting');
  const [copied, setCopied] = useState(false);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    setDevMode(!getOasisHost());
    setOasisState(getOasisState());
    const id = setInterval(() => {
      setOasisState(getOasisState());
      setDevMode(!getOasisHost());
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const statusLabel =
    oasisState === 'ready' ? '● ready' :
    oasisState === 'loading' ? '◌ loading…' :
    '○ waiting';

  const canGenerate = !isGenerating && (yesterday.trim() || today.trim() || blockers.trim());

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    const prompt = `Please format the following as a daily standup update:

Yesterday:
${yesterday.trim() || 'Nothing noted'}

Today:
${today.trim() || 'Nothing noted'}

Blockers:
${blockers.trim() || 'None'}`;

    setIsGenerating(true);
    setOutput('');
    try {
      await streamCompletion(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 512,
        temperature: 0.4,
        onToken: (token) => setOutput(prev => prev + token),
      });
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [yesterday, today, blockers, canGenerate]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = output;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  const handleClear = useCallback(() => {
    setYesterday('');
    setToday('');
    setBlockers('');
    setOutput('');
    setCopied(false);
  }, []);

  return (
    <div className="app">
      <style>{styles}</style>

      <header className="header">
        <span className="header-title">Daily Standup</span>
        <div className="status-badge">
          <span className={`status-dot ${oasisState}`} />
          <span>{statusLabel}</span>
        </div>
        <button className="btn-launcher" onClick={goToLauncher}>← Launcher</button>
      </header>

      {devMode && (
        <div className="dev-banner">
          Running outside Apogee — AI features disabled
        </div>
      )}

      <main className="main">
        <div className="field-group">
          <div className="field-label">
            ✅ Yesterday
          </div>
          <textarea
            value={yesterday}
            onChange={e => setYesterday(e.target.value)}
            placeholder="What did you work on yesterday? (e.g. Fixed the login bug, reviewed PRs, deployed v2.1)"
            rows={3}
            disabled={isGenerating}
          />
        </div>

        <div className="field-group">
          <div className="field-label">
            🎯 Today
          </div>
          <textarea
            value={today}
            onChange={e => setToday(e.target.value)}
            placeholder="What are you planning to do today? (e.g. Start on the dashboard feature, write tests for auth module)"
            rows={3}
            disabled={isGenerating}
          />
        </div>

        <div className="field-group">
          <div className="field-label">
            🚧 Blockers
          </div>
          <textarea
            value={blockers}
            onChange={e => setBlockers(e.target.value)}
            placeholder="Any blockers or impediments? Leave blank if none."
            rows={2}
            disabled={isGenerating}
          />
        </div>

        <div className="actions">
          <button
            className="btn-generate"
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            {isGenerating ? 'Generating…' : '✨ Format Standup'}
          </button>
          {(yesterday || today || blockers || output) && (
            <button className="btn-clear" onClick={handleClear} disabled={isGenerating}>
              Clear
            </button>
          )}
          {isGenerating && <span className="generating-label">AI is writing your standup…</span>}
        </div>

        {(output || isGenerating) && (
          <div className="output-panel">
            <div className="output-header">
              <span className="output-title">Formatted Standup</span>
              {output && (
                <button
                  className={`btn-copy${copied ? ' copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              )}
            </div>
            <div className="output-text">
              {output ? renderOutput(output) : null}
              {isGenerating && <span className="cursor" />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
