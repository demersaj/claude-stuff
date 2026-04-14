import { useState, useEffect } from 'react';
import { getSDK, getIntelligenceState, onIntelligenceChange, streamCompletion, cancelGeneration, goToLauncher } from './webai';

function App() {
  const [intelligenceState, setIntelligenceState] = useState('waiting');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Subscribe to intelligence state changes (not polling)
  useEffect(() => {
    setIntelligenceState(getIntelligenceState());
    return onIntelligenceChange(() => setIntelligenceState(getIntelligenceState()));
  }, []);

  async function handleRun() {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setOutput('');
    try {
      await streamCompletion(prompt, {
        systemPrompt: 'You are a helpful assistant.', // TODO: customize your system prompt
        onToken: (token) => setOutput(prev => prev + token),
      });
    } catch (err) {
      setOutput('Error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCancel() {
    cancelGeneration();
    setIsGenerating(false);
  }

  const statusLabel = {
    ready: '● Ready',
    loading: '◌ Loading…',
    waiting: '○ Waiting',
  }[intelligenceState];

  const sdk = getSDK();

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto', padding: 16 }}>
      {!sdk && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
          Running outside Apogee — AI features disabled
        </div>
      )}
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
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={handleRun}
            disabled={isGenerating || intelligenceState !== 'ready'}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            {isGenerating ? 'Generating…' : 'Run'}
          </button>
          {isGenerating && (
            <button onClick={handleCancel} style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Stop
            </button>
          )}
        </div>
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
