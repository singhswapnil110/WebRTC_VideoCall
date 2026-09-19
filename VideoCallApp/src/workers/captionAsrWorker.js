import { env, pipeline } from "@huggingface/transformers";

const TARGET_SAMPLE_RATE = 16000;

// These match the library defaults per device and are stated explicitly
// because they are load-bearing: the quantized graph has no WebGPU kernels for
// its MatMulInteger nodes and silently falls back to CPU, so WebGPU needs fp32.
// The q8 wasm path requires @huggingface/transformers >= 4.3 — the onnxruntime
// bundled with 4.2 fails to build a session for it ("Missing required scale
// ... MatMulNBits"), which is why package.json floors the dependency there.
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
// Two slots: a queued final is never displaced by a later partial, otherwise an
// utterance whose decode is still in flight loses its text entirely.
let pendingFinal = null;
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

const resampleTo16k = (input, inputRate) => {
  if (!(input instanceof Float32Array) || input.length === 0) {
    return new Float32Array();
  }

  if (!inputRate || inputRate === TARGET_SAMPLE_RATE) {
    return input;
  }

  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const weight = position - left;
    output[i] = input[left] * (1 - weight) + input[right] * weight;
  }

  return output;
};

const getRms = (audio) => {
  if (!audio.length) return 0;
  let total = 0;
  for (let i = 0; i < audio.length; i += 1) {
    total += audio[i] * audio[i];
  }
  return Math.sqrt(total / audio.length);
};

const resetSession = () => {
  workerGeneration += 1;
  state = createState();
  pendingFinal = null;
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
  state.currentChunks = state.preRollChunks.slice();
  state.currentSamples = state.preRollSamples;
  state.preRollChunks = [];
  state.preRollSamples = 0;
  state.speechMs = 0;
  state.silenceMs = 0;
  state.lastPartialAtMs = 0;
};

const endUtterance = () => {
  state.inSpeech = false;
  state.utteranceId = 0;
  state.currentChunks = [];
  state.currentSamples = 0;
  state.speechMs = 0;
  state.silenceMs = 0;
  state.lastPartialAtMs = 0;
};

const appendChunk = (chunk) => {
  state.currentChunks.push(chunk);
  state.currentSamples += chunk.length;
};

const queueDecode = (kind, utteranceId, audio, generation) => {
  if (!audio.length) return;
  const request = { kind, utteranceId, audio, generation };
  if (kind === "final") {
    // A queued partial for the same utterance is now redundant.
    if (pendingPartial?.utteranceId === utteranceId) pendingPartial = null;
    pendingFinal = request;
  } else {
    // Latest partial wins; finals are never touched.
    pendingPartial = request;
  }
  void processQueue();
};

const takeNextRequest = () => {
  if (pendingFinal) {
    const request = pendingFinal;
    pendingFinal = null;
    return request;
  }
  const request = pendingPartial;
  pendingPartial = null;
  return request;
};

const processQueue = async () => {
  if (processing || (!pendingFinal && !pendingPartial)) return;

  processing = true;
  const request = takeNextRequest();

  try {
    const pipe = await ensureTranscriber();
    const result = await pipe(request.audio);

    const text = normalizeText(result?.text);
    if (!text || request.generation !== workerGeneration) {
      return;
    }

    // A partial only makes sense while its utterance is still the live one.
    if (request.kind === "partial" && request.utteranceId !== state.utteranceId) {
      return;
    }

    post(request.kind, { text });
  } catch (error) {
    post("error", {
      code: "transcription-failed",
      message: error?.message || "Local transcription failed.",
    });
  } finally {
    processing = false;
    if (pendingFinal || pendingPartial) {
      void processQueue();
    }
  }
};

const closeUtterance = () => {
  const utteranceId = state.utteranceId;
  const audio = flattenChunks(state.currentChunks, state.currentSamples);
  const generation = workerGeneration;

  endUtterance();
  queueDecode("final", utteranceId, audio, generation);
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
  if (!transcriber || !(chunk instanceof Float32Array) || chunk.length === 0) return;

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

  appendChunk(audio);

  if (hasSpeech) {
    state.speechMs += chunkMs;
    state.silenceMs = 0;
  } else {
    state.silenceMs += chunkMs;
  }

  const currentMs = samplesToMs(state.currentSamples);

  // Only decode once enough of the buffer is actually speech — otherwise a
  // cough or key press gets sent to Whisper, which reliably hallucinates a
  // sentence for near-silent audio.
  const hasEnoughSpeech = state.speechMs >= config.minSpeechMs;

  if (currentMs >= config.maxUtteranceMs) {
    if (hasEnoughSpeech) closeUtterance();
    else endUtterance();
    return;
  }

  if (!hasSpeech && state.silenceMs >= config.hangoverMs) {
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
    queueDecode(
      "partial",
      state.utteranceId,
      flattenChunks(state.currentChunks, state.currentSamples),
      workerGeneration
    );
  }
};

self.onmessage = async (event) => {
  const { data } = event;

  if (data?.type === "init") {
    if (Number.isFinite(data.maxUtteranceMs)) {
      config = { ...config, maxUtteranceMs: data.maxUtteranceMs };
    }

    resetSession();

    try {
      await ensureTranscriber();
      post("ready", {
        model: config.model,
        device: DEVICE,
        dtype: DTYPE,
        sampleRate: TARGET_SAMPLE_RATE,
      });
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
