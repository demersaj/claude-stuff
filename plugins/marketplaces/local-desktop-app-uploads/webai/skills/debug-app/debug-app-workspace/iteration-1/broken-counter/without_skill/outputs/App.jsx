import { useState } from 'react';
import { getOasisHost } from './webai.js';

export default function App() {
  const [count, setCount] = useState(0);
  const [aiMessage, setAiMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  async function getAIComment() {
    setIsGenerating(true);
    setAiMessage('');

    const host = getOasisHost();
    if (!host) {
      setAiMessage('AI not available — open this app inside Apogee to use AI features.');
      setIsGenerating(false);
      return;
    }

    let release;
    try {
      release = await host.acquire({ warmRuntime: true });
      await host.request(`The counter is at ${count}. Give a one-sentence comment about this number.`, {
        maxTokens: 100,
        onToken: (token) => setAiMessage(prev => prev + token),
      });
    } catch (err) {
      setAiMessage(`Error: ${err.message}`);
    } finally {
      release?.();
      setIsGenerating(false);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Counter</h1>
      <div style={{ fontSize: 64, margin: '24px 0' }}>{count}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
        <button onClick={() => setCount(c => c - 1)}>-</button>
        <button onClick={() => setCount(0)}>Reset</button>
        <button onClick={() => setCount(c => c + 1)}>+</button>
      </div>
      <button onClick={getAIComment} disabled={isGenerating}>
        {isGenerating ? 'Thinking...' : 'Ask AI about this number'}
      </button>
      {aiMessage && <p style={{ marginTop: 16 }}>{aiMessage}</p>}
    </div>
  );
}
