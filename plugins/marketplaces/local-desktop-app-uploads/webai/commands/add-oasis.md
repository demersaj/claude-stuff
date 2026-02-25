---
description: Add OasisHost AI inference wiring to an existing webAI app
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Oasis

Add OasisHost AI inference to a webAI app component or file.

## Process

1. **Read the webai-app skill** for the full OasisHost API contract.

2. **Identify where to add AI** - if a file/component path is provided, use it. Otherwise, examine `src/` and ask the user which component should have AI capabilities.

3. **Check for `src/webai.js`** - if it exists and exports `streamCompletion` and `getOasisState`, import from there. If not, add the functions inline.

4. **Framework detection** - read `package.json` to determine React or Vue.

5. **For React** - add to the target component:
   ```jsx
   // Oasis state polling
   const [oasisState, setOasisState] = useState('waiting');
   useEffect(() => {
     const probe = () => {
       const host = window.OasisHost ?? window.parent?.OasisHost;
       if (!host?.getStatus) return 'waiting';
       const s = host.getStatus();
       if (s?.lastModel) return 'ready';
       if (s?.loadingModel || s?.isGenerating) return 'loading';
       return 'waiting';
     };
     setOasisState(probe());
     const id = setInterval(() => setOasisState(probe()), 1200);
     return () => clearInterval(id);
   }, []);

   // AI request handler
   const [aiOutput, setAiOutput] = useState('');
   const [isGenerating, setIsGenerating] = useState(false);

   async function runAI(userPrompt) {
     setIsGenerating(true);
     setAiOutput('');
     try {
       await streamCompletion(
         userPrompt,
         'You are a helpful assistant.', // customize system prompt
         (token) => setAiOutput(prev => prev + token)
       );
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
   const oasisState = ref('waiting');
   const aiOutput = ref('');
   const isGenerating = ref(false);
   let oasisInterval = null;

   onMounted(() => {
     const probe = () => {
       const host = window.OasisHost ?? window.parent?.OasisHost;
       if (!host?.getStatus) return 'waiting';
       const s = host.getStatus();
       if (s?.lastModel) return 'ready';
       if (s?.loadingModel || s?.isGenerating) return 'loading';
       return 'waiting';
     };
     oasisState.value = probe();
     oasisInterval = setInterval(() => { oasisState.value = probe(); }, 1200);
   });

   onUnmounted(() => clearInterval(oasisInterval));

   async function runAI(userPrompt) {
     isGenerating.value = true;
     aiOutput.value = '';
     try {
       await streamCompletion(
         userPrompt,
         'You are a helpful assistant.',
         (token) => { aiOutput.value += token; }
       );
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
- Always handle the case where `OasisHost` is null (dev environment outside Apogee).
- Always clean up the polling interval on unmount/unmounted.
- Customize system prompt placeholder to match the app's apparent purpose.
