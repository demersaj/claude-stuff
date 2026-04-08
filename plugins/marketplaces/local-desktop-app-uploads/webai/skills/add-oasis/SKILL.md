---
name: add-oasis
description: Add OasisHost AI inference wiring to an existing webAI app
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Oasis

Add OasisHost AI inference to a webAI app component or file.

## Process

1. **Read the webai-app skill** for the full OasisHost API contract.

2. **Identify where to add AI** - if a file/component path is provided, use it. Otherwise, examine `src/` and ask the user which component should have AI capabilities.

3. **Check for `src/webai.js`** - if it exists and exports `streamCompletion` and `getOasisState`, import from there. If not, add the functions inline using the canonical implementations from the webai-app skill reference.

4. **Framework detection** - read `package.json` to determine React or Vue.

5. **For React** - add to the target component:
   ```jsx
   // Import from webai.js if it exists, otherwise add inline
   import { streamCompletion, getOasisState } from './webai.js';

   // Oasis state polling
   const [oasisState, setOasisState] = useState('waiting');
   useEffect(() => {
     setOasisState(getOasisState());
     const id = setInterval(() => setOasisState(getOasisState()), 1200);
     return () => clearInterval(id);
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
   ```

6. **For Vue** - add to the target component:
   ```javascript
   // In <script setup>
   import { streamCompletion, getOasisState } from './webai.js';

   const oasisState = ref('waiting');
   const aiOutput = ref('');
   const isGenerating = ref(false);
   let oasisInterval = null;

   onMounted(() => {
     oasisState.value = getOasisState();
     oasisInterval = setInterval(() => { oasisState.value = getOasisState(); }, 1200);
   });

   onUnmounted(() => clearInterval(oasisInterval));

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

7. **Add status indicator to the template/JSX**:
   ```
   AI status: {oasisState === 'ready' ? '🟢 AI Ready' : oasisState === 'loading' ? '🟡 Loading...' : '⚪ No Model'}
   ```

8. **Print summary** of what was added and how to customize the system prompt.

## Rules

- Never remove existing component logic - only add AI wiring alongside it.
- Always import `streamCompletion` and `getOasisState` from `src/webai.js` if it exists — never inline duplicate implementations or access `window.OasisHost` directly. The safe accessor in `webai.js` handles null-safety for dev mode.
- `streamCompletion` takes an options object as the second arg: `{ systemPrompt, maxTokens, temperature, onToken }` — not positional arguments.
- Always clean up the polling interval on unmount/unmounted.
- Customize system prompt placeholder to match the app's apparent purpose.
