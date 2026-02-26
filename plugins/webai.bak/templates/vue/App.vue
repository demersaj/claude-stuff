<template>
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 16px;">
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
      <button
        @click="handleRun"
        :disabled="isGenerating || oasisState !== 'ready'"
        style="margin-top: 8px; padding: 8px 16px; cursor: pointer;"
      >
        {{ isGenerating ? 'Generating...' : 'Run' }}
      </button>
      <pre v-if="output" style="margin-top: 16px; background: #f5f5f5; padding: 12px; border-radius: 4px; white-space: pre-wrap; font-size: 14px;">{{ output }}</pre>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getOasisState, streamCompletion, goToLauncher } from './webai';

const oasisState = ref('waiting');
const prompt = ref('');
const output = ref('');
const isGenerating = ref(false);
let oasisInterval = null;

const statusLabel = computed(() => ({
  ready: '🟢 AI Ready',
  loading: '🟡 Loading...',
  waiting: '⚪ No Model',
}[oasisState.value]));

onMounted(() => {
  oasisState.value = getOasisState();
  oasisInterval = setInterval(() => { oasisState.value = getOasisState(); }, 1200);
});

onUnmounted(() => clearInterval(oasisInterval));

async function handleRun() {
  if (!prompt.value.trim() || isGenerating.value) return;
  isGenerating.value = true;
  output.value = '';
  try {
    await streamCompletion(
      prompt.value,
      'You are a helpful assistant.', // TODO: customize your system prompt
      (token) => { output.value += token; }
    );
  } catch (err) {
    output.value = 'Error: ' + err.message;
  } finally {
    isGenerating.value = false;
  }
}
</script>
