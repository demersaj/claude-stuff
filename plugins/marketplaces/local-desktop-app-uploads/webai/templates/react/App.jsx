import { useState, useEffect } from 'react';
import { getOasisState, streamCompletion, goToLauncher } from './webai';

function App() {
  const [oasisState, setOasisState] = useState('waiting');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Poll Oasis AI status every 1.2s
  useEffect(() => {
    setOasisState(getOasisState());
    const id = setInterval(() => setOasisState(getOasisState()), 1200);
    return () => clearInterval(id);
  }, []);

  async function handleRun() {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setOutput('');
    try {
      await streamCompletion(
        prompt,
        'You are a helpful assistant.', // TODO: customize your system prompt
        (token) => setOutput(prev => prev + token)
      );
    } catch (err) {
      setOutput('Error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  const statusLabel = {
    ready: '🟢 AI Ready',
    loading: '🟡 Loading...',
    waiting: '⚪ No Model',
  }[oasisState];

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>My webAI App</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>{statusLabel}</span>
          <button onClick={goToLauncher} style={{ fontSize: 13, cursor: 'pointer' }}>
            ← Launcher
          </button>
        </div>
      </header>

      <main>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          rows={4}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, padding: 8 }}
        />
        <button
          onClick={handleRun}
          disabled={isGenerating || oasisState !== 'ready'}
          style={{ marginTop: 8, padding: '8px 16px', cursor: 'pointer' }}
        >
          {isGenerating ? 'Generating...' : 'Run'}
        </button>
        {output && (
          <pre style={{ marginTop: 16, background: '#f5f5f5', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap', fontSize: 14 }}>
            {output}
          </pre>
        )}
      </main>
    </div>
  );
}

export default App;
