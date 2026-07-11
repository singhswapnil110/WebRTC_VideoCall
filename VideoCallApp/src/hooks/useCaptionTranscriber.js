import { useEffect, useMemo, useRef, useState } from "react";

const TARGET_SAMPLE_RATE = 16000;
const DEFAULT_MODEL = "Xenova/whisper-tiny";

const getAudioContextConstructor = () => window.AudioContext || window.webkitAudioContext || null;

const canTranscribeLocally = () =>
  typeof window !== "undefined" &&
  typeof Worker !== "undefined" &&
  typeof AudioWorkletNode !== "undefined" &&
  Boolean(getAudioContextConstructor());

export function useCaptionTranscriber({
  enabled,
  localStream,
  maxUtteranceMs = 4000,
  onResult,
  onError,
  onStart,
  onEnd,
} = {}) {
  const workerRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sinkNodeRef = useRef(null);
  const initPromiseRef = useRef(null);
  const initResolverRef = useRef({ resolve: null, reject: null });
  const readyRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  onResultRef.current = onResult;
  onErrorRef.current = onError;
  onStartRef.current = onStart;
  onEndRef.current = onEnd;

  useEffect(() => {
    setSupported(canTranscribeLocally());
  }, []);

  useEffect(() => {
    if (!canTranscribeLocally()) return undefined;

    const worker = new Worker(new URL("../workers/captionAsrWorker.js", import.meta.url), {
      type: "module",
    });

    worker.onmessage = ({ data }) => {
      if (!data?.type) return;

      if (data.type === "status") {
        setStatus(data.state || "idle");
        return;
      }

      if (data.type === "ready") {
        readyRef.current = true;
        setStatus("ready");
        initResolverRef.current.resolve?.();
        initResolverRef.current = { resolve: null, reject: null };
        return;
      }

      if (data.type === "partial" || data.type === "final") {
        onResultRef.current?.({
          text: data.text,
          isFinal: data.type === "final",
          detectedLanguage: data.detectedLanguage,
        });
        return;
      }

      if (data.type === "error") {
        const nextError = {
          code: data.code || "caption-engine-error",
          message: data.message || "Local captions failed.",
        };
        setStatus("error");
        setError(nextError);
        initResolverRef.current.reject?.(nextError);
        initResolverRef.current = { resolve: null, reject: null };
        onErrorRef.current?.(nextError);
      }
    };

    workerRef.current = worker;

    return () => {
      initResolverRef.current.reject?.({
        code: "worker-disposed",
        message: "Caption worker was disposed.",
      });
      initResolverRef.current = { resolve: null, reject: null };
      readyRef.current = false;
      setStatus("idle");
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const teardownAudioGraph = async () => {
    workletNodeRef.current?.port?.postMessage?.({ type: "flush" });
    workletNodeRef.current?.disconnect?.();
    sourceNodeRef.current?.disconnect?.();
    sinkNodeRef.current?.disconnect?.();

    workletNodeRef.current = null;
    sourceNodeRef.current = null;
    sinkNodeRef.current = null;

    const currentContext = audioContextRef.current;
    audioContextRef.current = null;
    if (currentContext) {
      await currentContext.close();
    }
  };

  const ensureWorkerReady = async () => {
    if (!workerRef.current) {
      throw { code: "worker-unavailable", message: "Caption worker is unavailable." };
    }

    if (!initPromiseRef.current) {
      initPromiseRef.current = new Promise((resolve, reject) => {
        initResolverRef.current = { resolve, reject };
      }).finally(() => {
        initPromiseRef.current = null;
      });
    }

    readyRef.current = false;
    workerRef.current.postMessage({
      type: "init",
      model: DEFAULT_MODEL,
      device: navigator.gpu ? "webgpu" : "wasm",
      dtype: navigator.gpu ? undefined : "q8",
      maxUtteranceMs,
    });

    return initPromiseRef.current;
  };

  const setupAudioGraph = async (stream) => {
    if (!stream) {
      throw { code: "missing-stream", message: "Local audio stream is unavailable." };
    }

    if (workletNodeRef.current && audioContextRef.current) {
      return;
    }

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      throw { code: "unsupported-browser", message: "Local captions are unavailable in this browser." };
    }

    const context = new AudioContextConstructor({
      latencyHint: "interactive",
      sampleRate: TARGET_SAMPLE_RATE,
    });

    await context.audioWorklet.addModule(new URL("../audio/captionAudioWorklet.js", import.meta.url));
    if (context.state === "suspended") {
      await context.resume();
    }

    const source = context.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(context, "caption-audio-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    const sink = context.createGain();
    sink.gain.value = 0;

    node.port.onmessage = ({ data }) => {
      if (data?.type !== "audio" || !workerRef.current || !readyRef.current || !data.audio) return;
      workerRef.current.postMessage(
        {
          type: "audio",
          audio: data.audio,
          sampleRate: data.sampleRate || context.sampleRate,
        },
        [data.audio.buffer]
      );
    };

    source.connect(node);
    node.connect(sink);
    sink.connect(context.destination);

    audioContextRef.current = context;
    sourceNodeRef.current = source;
    workletNodeRef.current = node;
    sinkNodeRef.current = sink;
  };

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      workerRef.current?.postMessage({ type: "reset" });
      void teardownAudioGraph();
      onEndRef.current?.();
      return undefined;
    }

    if (!canTranscribeLocally()) {
      const unsupportedError = {
        code: "unsupported-browser",
        message: "Local captions are unavailable in this browser.",
      };
      setStatus("error");
      setError(unsupportedError);
      onErrorRef.current?.(unsupportedError);
      return undefined;
    }

    const hasAudioTrack = localStream?.getAudioTracks?.().some((track) => track.readyState !== "ended");
    if (!hasAudioTrack) {
      const streamError = {
        code: "missing-audio-track",
        message: "A live microphone track is required for captions.",
      };
      setStatus("error");
      setError(streamError);
      onErrorRef.current?.(streamError);
      return undefined;
    }

    let cancelled = false;

    const start = async () => {
      setError(null);
      setStatus("loading");
      await ensureWorkerReady();
      if (cancelled) return;
      await setupAudioGraph(localStream);
      if (cancelled) return;
      onStartRef.current?.();
    };

    start().catch((nextError) => {
      if (cancelled) return;
      const normalizedError = {
        code: nextError?.code || "caption-engine-error",
        message: nextError?.message || "Local captions failed to start.",
      };
      setStatus("error");
      setError(normalizedError);
      onErrorRef.current?.(normalizedError);
    });

    return () => {
      cancelled = true;
      workerRef.current?.postMessage({ type: "reset" });
      void teardownAudioGraph();
      onEndRef.current?.();
    };
  }, [enabled, localStream, maxUtteranceMs]);

  return useMemo(() => ({ supported, status, error }), [supported, status, error]);
}
