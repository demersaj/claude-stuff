---
name: add-oasis
description: Add SDK intelligence AI inference wiring to an existing webAI app
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Intelligence

Add AI inference via `sdk.intelligence` to a webAI app component or file.

## Process

1. **Read the webai-app skill** for the full intelligence API contract.

2. **Identify where to add AI** — if a file/component path is provided, use it. Otherwise, examine `src/` and ask the user which component should have AI capabilities.

3. **Check for `src/webai.js`** — if it exists and exports `streamCompletion` and `getIntelligenceState`, import from there. If not, create it using the canonical implementation from the webai-app skill reference.

4. **Check the shell manifest** in `index.html` — ensure `"intelligence"` is listed in `requires.managers`. If the manifest is missing entirely, add it.

5. **Framework detection** — read `package.json` to determine React or Vue.

6. **For React** — add to the target component:
   ```jsx
   import { streamCompletion, getIntelligenceState, onIntelligenceChange, cancelGeneration } from './webai.js';

   // Intelligence state (subscribe, not polling)
   const [intelligenceState, setIntelligenceState] = useState('waiting');
   useEffect(() => {
     setIntelligenceState(getIntelligenceState());
     return onIntelligenceChange(() => setIntelligenceState(getIntelligenceState()));
   }, []);

   // AI request handler
   const [aiOutput, setAiOutput] = useState('');
   const [isGenerating, setIsGenerating] = useState(false);

   async function runAI(userPrompt) {
     setIsGenerating(true);
     setAiOutput('');
     try {
       await streamCompletion(userPrompt, {
         systemPrompt: 'You are a helpful assistant.', // customize to match app purpose
         onToken: (token) => setAiOutput(prev => prev + token),
       });
     } catch (err) {
       setAiOutput('Error: ' + err.message);
     } finally {
       setIsGenerating(false);
     }
   }

   function handleCancel() {
     cancelGeneration();
     setIsGenerating(false);
   }
   ```

7. **For Vue** — add to the target component:
   ```javascript
   // In <script setup>
   import { streamCompletion, getIntelligenceState, onIntelligenceChange, cancelGeneration } from './webai.js';

   const intelligenceState = ref('waiting');
   const aiOutput = ref('');
   const isGenerating = ref(false);

   onMounted(() => {
     intelligenceState.value = getIntelligenceState();
     const unsub = onIntelligenceChange(() => {
       intelligenceState.value = getIntelligenceState();
     });
     onUnmounted(unsub);
   });

   async function runAI(userPrompt) {
     isGenerating.value = true;
     aiOutput.value = '';
     try {
       await streamCompletion(userPrompt, {
         systemPrompt: 'You are a helpful assistant.',
         onToken: (token) => { aiOutput.value += token; },
       });
     } catch (err) {
       aiOutput.value = 'Error: ' + err.message;
     } finally {
       isGenerating.value = false;
     }
   }
   ```

8. **Add status indicator and stop button to the template/JSX**:
   ```jsx
   <span className={`ai-status ai-status--${intelligenceState}`}>
     {intelligenceState === 'ready' ? '● Ready' : intelligenceState === 'loading' ? '◌ Loading…' : '○ Waiting'}
   </span>
   {isGenerating && (
     <button onClick={handleCancel}>Stop</button>
   )}
   ```

9. **Print summary** of what was added and how to customize the system prompt.

## Rules

- Never poll `getIntelligenceState` on an interval — use `onIntelligenceChange` to subscribe and clean up on unmount.
- Always import from `src/webai.js` — never access `window.apogeeSDK` directly in components.
- Never use `window.OasisHost` — the current API is `sdk.intelligence` accessed via `getSDK()` in `webai.js`.
- `streamCompletion` takes an options object as the second arg: `{ systemPrompt, maxTokens, temperature, model, onToken, priorMessages, ...rest }` — not positional arguments.
- Customize the system prompt placeholder to match the app's apparent purpose.
- Add a cancel/stop button when `isGenerating` is true — `cancelGeneration()` stops the stream without crashing.
- Always clean up the subscribe unsubscribe on unmount.
