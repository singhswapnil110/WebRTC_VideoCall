import { env, pipeline } from "@huggingface/transformers";

const TARGET_SAMPLE_RATE = 16000;
const DEFAULT_CONFIG = {
  model: "Xenova/whisper-tiny",
  device: "wasm",
  dtype: "q8",
  task: "transcribe",
  language: null,
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
let pendingDecode = null;
let workerGeneration = 0;
let finalizedUtteranceId = 0;

const createState = () => ({
  inSpeech: false,
  utteranceId: 0,
  preRollChunks: [],
  preRollSamples: 0,
  currentChunks: [],
  currentSamples: 0,
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
  finalizedUtteranceId = 0;
  state = createState();
  pendingDecode = null;
};

const rememberPreRoll = (chunk) => {
  state.preRollChunks.push(chunk);
  state.preRollSamples += chunk.length;

  const maxSamples = msToSamples(config.preRollMs);
  while (state.preRollSamples > maxSamples && state.preRollChunks.length) {
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
  state.silenceMs = 0;
  state.lastPartialAtMs = 0;
};

const appendChunk = (chunk) => {
  state.currentChunks.push(chunk);
  state.currentSamples += chunk.length;
};

const queueDecode = (kind, utteranceId, audio, generation) => {
  if (!audio.length) return;
  pendingDecode = { kind, utteranceId, audio, generation };
  void processQueue();
};

const processQueue = async () => {
  if (processing || !pendingDecode) return;

  processing = true;
  const request = pendingDecode;
  pendingDecode = null;

  try {
    const pipe = await ensureTranscriber();
    const result = await pipe(request.audio, {
      task: config.task,
      language: config.language || undefined,
      force_full_sequences: request.kind === "final",
    });

    const text = normalizeText(result?.text);
    if (!text || request.generation !== workerGeneration) {
      return;
    }

    if (request.kind === "partial") {
      const stalePartial =
        request.utteranceId !== state.utteranceId || request.utteranceId <= finalizedUtteranceId;
      if (stalePartial) return;
    }

    post(request.kind, {
      text,
      detectedLanguage: config.language || undefined,
    });
  } catch (error) {
    post("error", {
      code: "transcription-failed",
      message: error?.message || "Local transcription failed.",
    });
  } finally {
    processing = false;
    if (pendingDecode) {
      void processQueue();
    }
  }
};

const closeUtterance = (reason) => {
  const utteranceId = state.utteranceId;
  const audio = flattenChunks(state.currentChunks, state.currentSamples);
  const generation = workerGeneration;

  finalizedUtteranceId = utteranceId;
  state.inSpeech = false;
  state.currentChunks = [];
  state.currentSamples = 0;
  state.silenceMs = 0;
  state.lastPartialAtMs = 0;

  queueDecode("final", utteranceId, audio, generation);
  post("status", { state: "idle", reason });
};

const ensureTranscriber = async () => {
  if (transcriber) return transcriber;
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", config.model, {
      device: config.device,
      dtype: config.dtype,
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
    post("status", { state: "listening" });
  }

  appendChunk(audio);

  if (hasSpeech) {
    state.silenceMs = 0;
  } else {
    state.silenceMs += chunkMs;
  }

  const currentMs = samplesToMs(state.currentSamples);
  const shouldEmitPartial =
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

  if (currentMs >= config.maxUtteranceMs) {
    closeUtterance("max-utterance");
    return;
  }

  if (!hasSpeech && state.silenceMs >= config.hangoverMs && currentMs >= config.minSpeechMs) {
    closeUtterance("silence");
  }
};

self.onmessage = async (event) => {
  const { data } = event;

  if (data?.type === "init") {
    config = {
      ...config,
      ...data,
      device: data.device || config.device,
      dtype: data.dtype || config.dtype,
      language: data.language ?? config.language,
    };

    resetSession();
    post("status", { state: "loading" });

    try {
      await ensureTranscriber();
      post("ready", {
        model: config.model,
        device: config.device,
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
    post("status", { state: "idle", reason: "reset" });
  }
};
