import { env, pipeline } from "@huggingface/transformers";

const TARGET_SAMPLE_RATE = 16000;

// fp32 on WebGPU (quantized ops fall back to CPU); q8 on wasm needs transformers >= 4.3.
const WEBGPU_AVAILABLE = typeof navigator !== "undefined" && Boolean(navigator.gpu);
const DEVICE = WEBGPU_AVAILABLE ? "webgpu" : "wasm";
const DTYPE = WEBGPU_AVAILABLE ? "fp32" : "q8";

const DEFAULT_CONFIG = {
  model: "Xenova/whisper-tiny",
  maxUtteranceMs: 4000,
  preRollMs: 250,
  hangoverMs: 450,
  minSpeechMs: 300,
  minPartialMs: 900,
  partialIntervalMs: 1200,
  energyThreshold: 0.012,
};

env.allowLocalModels = false;
env.useBrowserCache = true;

let config = { ...DEFAULT_CONFIG };
let transcriber = null;
let transcriberPromise = null;
let processing = false;
// Finals queue in order so a slow decoder costs latency, never words.
let pendingFinals = [];
let pendingPartial = null;
let workerGeneration = 0;

const createState = () => ({
  inSpeech: false,
  utteranceId: 0,
  preRollChunks: [],
  preRollSamples: 0,
  currentChunks: [],
  currentSamples: 0,
  speechMs: 0,
  silenceMs: 0,
  lastPartialAtMs: 0,
});

let state = createState();

const post = (type, payload = {}) => {
  self.postMessage({ type, ...payload });
};

const msToSamples = (ms) => Math.max(1, Math.round((TARGET_SAMPLE_RATE * ms) / 1000));
const samplesToMs = (samples) => (samples / TARGET_SAMPLE_RATE) * 1000;

const normalizeText = (text) => (typeof text === "string" ? text.trim() : "");

const flattenChunks = (chunks, totalSamples) => {
  const merged = new Float32Array(totalSamples);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
};

// Only used when the browser refused a 16 kHz AudioContext. Averaging each
// output window is a crude low-pass, which keeps high frequencies from
// aliasing into the speech band.
const resampleTo16k = (input, inputRate) => {
  if (!inputRate || inputRate === TARGET_SAMPLE_RATE) return input;

  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const output = new Float32Array(Math.floor(input.length / ratio));

  for (let i = 0; i < output.length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    if (end <= start) {
      output[i] = input[Math.min(start, input.length - 1)];
      continue;
    }
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    output[i] = sum / (end - start);
  }

  return output;
};

const getRms = (audio) => {
  let total = 0;
  for (let i = 0; i < audio.length; i += 1) {
    total += audio[i] * audio[i];
  }
  return Math.sqrt(total / audio.length);
};

const resetSession = () => {
  workerGeneration += 1;
  state = createState();
  pendingFinals = [];
  pendingPartial = null;
};

const rememberPreRoll = (chunk) => {
  state.preRollChunks.push(chunk);
  state.preRollSamples += chunk.length;

  const maxSamples = msToSamples(config.preRollMs);
  while (state.preRollSamples > maxSamples && state.preRollChunks.length > 1) {
    const removed = state.preRollChunks.shift();
    state.preRollSamples -= removed.length;
  }
};

const startSpeech = () => {
  state.inSpeech = true;
  state.utteranceId += 1;
  state.currentChunks = state.preRollChunks;
  state.currentSamples = state.preRollSamples;
  state.preRollChunks = [];
  state.preRollSamples = 0;
  state.speechMs = 0;
  state.silenceMs = 0;
  state.lastPartialAtMs = 0;
};

const endUtterance = () => {
  state.inSpeech = false;
  state.currentChunks = [];
  state.currentSamples = 0;
};

const queueDecode = (kind, utteranceId, audio) => {
  const request = { kind, utteranceId, audio, generation: workerGeneration };
  if (kind === "final") {
    if (pendingPartial?.utteranceId === utteranceId) pendingPartial = null;
    pendingFinals.push(request);
  } else {
    pendingPartial = request;
  }
  void processQueue();
};

const processQueue = async () => {
  if (processing) return;
  const request = pendingFinals.shift() ?? pendingPartial;
  if (!request) return;
  if (request === pendingPartial) pendingPartial = null;

  processing = true;
  try {
    const pipe = await ensureTranscriber();
    const result = await pipe(request.audio);

    const text = normalizeText(result?.text);
    if (!text || request.generation !== workerGeneration) return;

    const partialIsStale =
      request.kind === "partial" && (!state.inSpeech || request.utteranceId !== state.utteranceId);
    if (partialIsStale) return;

    post(request.kind, { text });
  } catch (error) {
    post("decode-error", { message: error?.message || "Local transcription failed." });
  } finally {
    processing = false;
    void processQueue();
  }
};

const closeUtterance = () => {
  const audio = flattenChunks(state.currentChunks, state.currentSamples);
  const { utteranceId } = state;
  endUtterance();
  queueDecode("final", utteranceId, audio);
};

const ensureTranscriber = async () => {
  if (transcriber) return transcriber;
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", config.model, {
      device: DEVICE,
      dtype: DTYPE,
    })
      .then((instance) => {
        transcriber = instance;
        return instance;
      })
      .catch((error) => {
        transcriberPromise = null;
        throw error;
      });
  }
  return transcriberPromise;
};

const handleAudio = (chunk, inputRate) => {
  if (!transcriber || chunk.length === 0) return;

  const audio = resampleTo16k(chunk, inputRate);
  if (!audio.length) return;

  const chunkMs = samplesToMs(audio.length);
  const hasSpeech = getRms(audio) >= config.energyThreshold;

  if (!state.inSpeech) {
    if (!hasSpeech) {
      rememberPreRoll(audio);
      return;
    }
    startSpeech();
  }

  state.currentChunks.push(audio);
  state.currentSamples += audio.length;

  if (hasSpeech) {
    state.speechMs += chunkMs;
    state.silenceMs = 0;
  } else {
    state.silenceMs += chunkMs;
  }

  const currentMs = samplesToMs(state.currentSamples);
  // Whisper hallucinates whole sentences from near-silence, so a burst too
  // short to be speech is dropped rather than decoded.
  const hasEnoughSpeech = state.speechMs >= config.minSpeechMs;
  const reachedEnd =
    currentMs >= config.maxUtteranceMs || (!hasSpeech && state.silenceMs >= config.hangoverMs);

  if (reachedEnd) {
    if (hasEnoughSpeech) closeUtterance();
    else endUtterance();
    return;
  }

  const shouldEmitPartial =
    hasEnoughSpeech &&
    currentMs >= config.minPartialMs &&
    currentMs - state.lastPartialAtMs >= config.partialIntervalMs;

  if (shouldEmitPartial) {
    state.lastPartialAtMs = currentMs;
    queueDecode("partial", state.utteranceId, flattenChunks(state.currentChunks, state.currentSamples));
  }
};

self.onmessage = async ({ data }) => {
  if (data?.type === "init") {
    if (Number.isFinite(data.maxUtteranceMs)) {
      config = { ...config, maxUtteranceMs: data.maxUtteranceMs };
    }
    resetSession();

    try {
      await ensureTranscriber();
      post("ready");
    } catch (error) {
      post("error", {
        code: "model-load-failed",
        message: error?.message || "Local caption model failed to load.",
      });
    }
    return;
  }

  if (data?.type === "audio") {
    const audio = data.audio instanceof Float32Array ? data.audio : new Float32Array(data.audio || []);
    handleAudio(audio, data.sampleRate || TARGET_SAMPLE_RATE);
    return;
  }

  if (data?.type === "reset") {
    resetSession();
  }
};
