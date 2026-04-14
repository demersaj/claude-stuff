<template>
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 16px;">
    <div v-if="!sdk" style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; font-size: 13px;">
      Running outside Apogee — AI features disabled
    </div>
    <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h1 style="margin: 0; font-size: 20px;">My webAI App</h1>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span style="font-size: 13px; color: #666;">{{ statusLabel }}</span>
        <button @click="goToLauncher" style="font-size: 13px; cursor: pointer;">
          ← Launcher
        </button>
      </div>
    </header>

    <main>
      <textarea
        v-model="prompt"
        placeholder="Enter your prompt..."
        rows="4"
        style="width: 100%; box-sizing: border-box; font-size: 14px; padding: 8px;"
      />
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button
          @click="handleRun"
          :disabled="isGenerating || intelligenceState !== 'ready'"
          style="padding: 8px 16px; cursor: pointer;"
        >
          {{ isGenerating ? 'Generating…' : 'Run' }}
        </button>
        <button v-if="isGenerating" @click="handleCancel" style="padding: 8px 16px; cursor: pointer;">
          Stop
        </button>
      </div>
      <pre v-if="output" style="margin-top: 16px; background: #f5f5f5; padding: 12px; border-radius: 4px; white-space: pre-wrap; font-size: 14px;">{{ output }}</pre>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getSDK, getIntelligenceState, onIntelligenceChange, streamCompletion, cancelGeneration, goToLauncher } from './webai';

const sdk = getSDK();
const intelligenceState = ref('waiting');
const prompt = ref('');
const output = ref('');
const isGenerating = ref(false);

const statusLabel = computed(() => ({
  ready: '● Ready',
  loading: '◌ Loading…',
  waiting: '○ Waiting',
}[intelligenceState.value]));

let unsub = null;

onMounted(() => {
  intelligenceState.value = getIntelligenceState();
  unsub = onIntelligenceChange(() => {
    intelligenceState.value = getIntelligenceState();
  });
});

onUnmounted(() => unsub?.());

async function handleRun() {
  if (!prompt.value.trim() || isGenerating.value) return;
  isGenerating.value = true;
  output.value = '';
  try {
    await streamCompletion(prompt.value, {
      systemPrompt: 'You are a helpful assistant.', // TODO: customize your system prompt
      onToken: (token) => { output.value += token; },
    });
  } catch (err) {
    output.value = 'Error: ' + err.message;
  } finally {
    isGenerating.value = false;
  }
}

function handleCancel() {
  cancelGeneration();
  isGenerating.value = false;
}
</script>
