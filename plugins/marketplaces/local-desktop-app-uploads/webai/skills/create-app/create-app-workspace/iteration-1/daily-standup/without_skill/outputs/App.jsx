import { useState, useCallback } from 'react'
import './App.css'

function getOasisHost() {
  return window.OasisHost ?? window.parent?.OasisHost ?? null
}

function App() {
  const [yesterday, setYesterday] = useState('')
  const [today, setToday] = useState('')
  const [blockers, setBlockers] = useState('')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!yesterday.trim() && !today.trim() && !blockers.trim()) {
      setError('Please fill in at least one field before generating.')
      return
    }

    const host = getOasisHost()
    if (!host) {
      setError('AI runtime is not available. Make sure you are running inside the webAI shell.')
      return
    }

    setError('')
    setOutput('')
    setIsLoading(true)

    const userInput = [
      yesterday.trim() ? `Yesterday: ${yesterday.trim()}` : null,
      today.trim() ? `Today: ${today.trim()}` : null,
      blockers.trim() ? `Blockers: ${blockers.trim()}` : 'Blockers: None',
    ]
      .filter(Boolean)
      .join('\n')

    const systemPrompt = `You are a professional scrum master assistant. Your job is to take a developer's raw standup notes and rewrite them as a clean, concise daily standup update.

Format the output exactly like this:
**Yesterday:** [1-2 concise sentences summarizing what was done]
**Today:** [1-2 concise sentences describing the plan]
**Blockers:** [Either "None" or a brief, clear description of the blocker]

Rules:
- Be concise and professional — cut filler words
- Use past tense for yesterday, present/future tense for today
- If there are no blockers, write "None"
- Do not add any extra commentary or preamble — output only the formatted standup`

    const tokens = []

    try {
      const release = await host.acquire({ warmRuntime: true })
      try {
        await host.request(userInput, {
          systemPrompt,
          maxTokens: 512,
          temperature: 0.4,
          onToken: (token) => {
            tokens.push(token)
            setOutput(tokens.join(''))
          },
        })
      } finally {
        release()
      }
    } catch (err) {
      setError(`Failed to generate standup: ${err?.message ?? String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }, [yesterday, today, blockers])

  const handleCopy = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older environments
      const el = document.createElement('textarea')
      el.value = output
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [output])

  const handleClear = useCallback(() => {
    setYesterday('')
    setToday('')
    setBlockers('')
    setOutput('')
    setError('')
    setCopied(false)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Daily Standup</h1>
        <p className="subtitle">Type your notes and let AI write the standup for you</p>
      </header>

      <main className="app-main">
        <div className="input-section">
          <div className="field">
            <label htmlFor="yesterday">Yesterday</label>
            <textarea
              id="yesterday"
              placeholder="What did you work on yesterday?"
              value={yesterday}
              onChange={(e) => setYesterday(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="today">Today</label>
            <textarea
              id="today"
              placeholder="What are you planning to do today?"
              value={today}
              onChange={(e) => setToday(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="blockers">Blockers</label>
            <textarea
              id="blockers"
              placeholder="Any blockers? Leave blank if none."
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              rows={2}
              disabled={isLoading}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="button-row">
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Generating...
                </>
              ) : (
                'Generate Standup'
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear
            </button>
          </div>
        </div>

        {(output || isLoading) && (
          <div className="output-section">
            <div className="output-header">
              <h2>Your Standup</h2>
              {output && (
                <button
                  className="btn btn-copy"
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              )}
            </div>
            <div className="output-content">
              {output ? (
                <pre className="output-text">{output}</pre>
              ) : (
                <p className="output-placeholder">Writing your standup...</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
