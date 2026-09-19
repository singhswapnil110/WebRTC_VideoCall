import { useEffect, useMemo, useRef, useState } from "react";

const getAudioContextConstructor = () =>
  (typeof window === "undefined" ? null : window.AudioContext || window.webkitAudioContext) || null;

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
  const [supported] = useState(canTranscribeLocally);
  const [status, setStatus] = useState("idle");

  onResultRef.current = onResult;
  onErrorRef.current = onError;
  onStartRef.current = onStart;

  // The worker statically imports the transformers runtime, so it is created on
  // first use rather than at mount — a visitor who never turns captions on
  // should not pay for that chunk. It is kept alive afterwards so toggling
  // captions does not re-download the model.
  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(new URL("../workers/captionAsrWorker.js", import.meta.url), {
      type: "module",
    });

    worker.onmessage = ({ data }) => {
      if (!data?.type) return;

      if (data.type === "ready") {
        readyRef.current = true;
        setStatus("ready");
        initResolverRef.current.resolve?.();
        initResolverRef.current = { resolve: null, reject: null };
        return;
      }

      if (data.type === "partial" || data.type === "final") {
        onResultRef.current?.({ text: data.text, isFinal: data.type === "final" });
        return;
      }

      if (data.type === "error") {
        const nextError = {
          code: data.code || "caption-engine-error",
          message: data.message || "Local captions failed.",
        };
        setStatus("error");
        initResolverRef.current.reject?.(nextError);
        initResolverRef.current = { resolve: null, reject: null };
        onErrorRef.current?.(nextError);
      }
    };

    workerRef.current = worker;
    return worker;
  };

  const teardownAudioGraph = async () => {
    // Detach first: a chunk delivered after the worker has been reset would
    // open a phantom utterance on the next session.
    const node = workletNodeRef.current;
    if (node?.port) node.port.onmessage = null;

    node?.disconnect?.();
    sourceNodeRef.current?.disconnect?.();
    sinkNodeRef.current?.disconnect?.();

    workletNodeRef.current = null;
    sourceNodeRef.current = null;
    sinkNodeRef.current = null;

    const currentContext = audioContextRef.current;
    audioContextRef.current = null;
    if (currentContext) {
      await currentContext.close().catch(() => {});
    }
  };

  const ensureWorkerReady = async (worker) => {
    if (!initPromiseRef.current) {
      initPromiseRef.current = new Promise((resolve, reject) => {
        initResolverRef.current = { resolve, reject };
      }).finally(() => {
        initPromiseRef.current = null;
      });
    }

    readyRef.current = false;
    // Device and dtype are decided inside the worker, which is the only place
    // that can observe a load failure.
    worker.postMessage({ type: "init", maxUtteranceMs });

    return initPromiseRef.current;
  };

  const setupAudioGraph = async (stream, isCancelled) => {
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

    // Run at the device's own rate: forcing 16 kHz here makes
    // createMediaStreamSource unreliable on WebKit. The worker resamples.
    const context = new AudioContextConstructor({ latencyHint: "interactive" });

    try {
      await context.audioWorklet.addModule(new URL("../audio/captionAudioWorklet.js", import.meta.url));
      if (context.state === "suspended") {
        await context.resume();
      }
      if (isCancelled()) {
        await context.close().catch(() => {});
        return;
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

      if (isCancelled()) {
        node.port.onmessage = null;
        node.disconnect();
        source.disconnect();
        sink.disconnect();
        await context.close().catch(() => {});
        return;
      }

      audioContextRef.current = context;
      sourceNodeRef.current = source;
      workletNodeRef.current = node;
      sinkNodeRef.current = sink;
    } catch (error) {
      await context.close().catch(() => {});
      throw error;
    }
  };

  useEffect(() => {
    if (!enabled) {
      // The previous run's cleanup already tore everything down.
      setStatus("idle");
      return undefined;
    }

    if (!canTranscribeLocally()) {
      const unsupportedError = {
        code: "unsupported-browser",
        message: "Local captions are unavailable in this browser.",
      };
      setStatus("error");
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
      onErrorRef.current?.(streamError);
      return undefined;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;

    const start = async () => {
      setStatus("loading");
      const worker = ensureWorker();
      await ensureWorkerReady(worker);
      if (cancelled) return;
      await setupAudioGraph(localStream, isCancelled);
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
      onErrorRef.current?.(normalizedError);
    });

    return () => {
      cancelled = true;
      workerRef.current?.postMessage({ type: "reset" });
      void teardownAudioGraph();
    };
  }, [enabled, localStream, maxUtteranceMs]);

  // Defined last on purpose: effect cleanups run in definition order, so the
  // enable effect above still has a live worker to send its reset to.
  useEffect(
    () => () => {
      initResolverRef.current.reject?.({
        code: "worker-disposed",
        message: "Caption worker was disposed.",
      });
      initResolverRef.current = { resolve: null, reject: null };
      readyRef.current = false;
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    []
  );

  return useMemo(() => ({ supported, status }), [supported, status]);
}
