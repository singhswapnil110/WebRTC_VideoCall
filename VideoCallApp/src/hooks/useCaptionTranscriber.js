import { useEffect, useRef, useState } from "react";

// A single failed decode is not worth interrupting captions for; a run of them is.
const MAX_CONSECUTIVE_DECODE_FAILURES = 3;
const TARGET_SAMPLE_RATE = 16000;

const getAudioContextConstructor = () =>
  (typeof window === "undefined" ? null : window.AudioContext || window.webkitAudioContext) || null;

const canTranscribeLocally = () =>
  typeof Worker !== "undefined" &&
  typeof AudioWorkletNode !== "undefined" &&
  Boolean(getAudioContextConstructor());

const openAudioSource = async (stream, sampleRate) => {
  const AudioContextConstructor = getAudioContextConstructor();
  const context = new AudioContextConstructor(
    sampleRate ? { latencyHint: "interactive", sampleRate } : { latencyHint: "interactive" }
  );
  try {
    await context.audioWorklet.addModule(new URL("../audio/captionAudioWorklet.js", import.meta.url));
    if (context.state === "suspended") await context.resume();
    return { context, source: context.createMediaStreamSource(stream) };
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
};

export function useCaptionTranscriber({ enabled, localStream, maxUtteranceMs = 4000, onResult, onError, onStart } = {}) {
  const workerRef = useRef(null);
  const graphRef = useRef(null);
  const initRef = useRef(null);
  const readyRef = useRef(false);
  const decodeFailuresRef = useRef(0);
  const callbacksRef = useRef({});
  const [status, setStatus] = useState("idle");

  callbacksRef.current = { onResult, onError, onStart };

  const fail = (error) => {
    setStatus("error");
    initRef.current?.reject({ ...error, reported: true });
    initRef.current = null;
    callbacksRef.current.onError?.(error);
  };

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;

    // Created on first use so visitors who never enable captions skip the runtime chunk.
    const worker = new Worker(new URL("../workers/captionAsrWorker.js", import.meta.url), { type: "module" });

    worker.onmessage = ({ data }) => {
      if (data?.type === "ready") {
        readyRef.current = true;
        setStatus("ready");
        initRef.current?.resolve();
        initRef.current = null;
      } else if (data?.type === "partial" || data?.type === "final") {
        decodeFailuresRef.current = 0;
        callbacksRef.current.onResult?.({ text: data.text, isFinal: data.type === "final" });
      } else if (data?.type === "decode-error") {
        decodeFailuresRef.current += 1;
        if (decodeFailuresRef.current >= MAX_CONSECUTIVE_DECODE_FAILURES) {
          fail({ code: "transcription-failed", message: data.message || "Local transcription keeps failing." });
        }
      } else if (data?.type === "error") {
        fail({ code: data.code || "caption-engine-error", message: data.message || "Local captions failed." });
      }
    };

    // Covers a worker script that never loads (bad chunk, CSP) as well as a crash later on.
    const handleWorkerFailure = (event) => {
      event?.preventDefault?.();
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      readyRef.current = false;
      fail({ code: "worker-failed", message: "The caption engine stopped unexpectedly." });
    };
    worker.onerror = handleWorkerFailure;
    worker.onmessageerror = handleWorkerFailure;

    workerRef.current = worker;
    return worker;
  };

  const initWorker = (worker) => {
    if (!initRef.current) {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      initRef.current = { promise, resolve, reject };
    }
    const { promise } = initRef.current;
    readyRef.current = false;
    worker.postMessage({ type: "init", maxUtteranceMs });
    return promise;
  };

  const setupAudioGraph = async (stream, isCancelled) => {
    if (graphRef.current) return;

    // At 16 kHz the browser resamples with proper filtering; engines that refuse
    // a mic source at a non-native rate fall back to the device rate.
    let opened;
    try {
      opened = await openAudioSource(stream, TARGET_SAMPLE_RATE);
    } catch {
      opened = await openAudioSource(stream);
    }
    const { context, source } = opened;

    if (isCancelled()) {
      await context.close().catch(() => {});
      return;
    }

    const node = new AudioWorkletNode(context, "caption-audio-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    const sink = context.createGain();
    sink.gain.value = 0;

    node.port.onmessage = ({ data }) => {
      const worker = workerRef.current;
      if (data?.type !== "audio" || !worker || !readyRef.current) return;
      worker.postMessage({ type: "audio", audio: data.audio, sampleRate: data.sampleRate }, [data.audio.buffer]);
    };

    source.connect(node);
    node.connect(sink);
    sink.connect(context.destination);
    graphRef.current = { context, source, node, sink };
  };

  const teardownAudioGraph = () => {
    const graph = graphRef.current;
    graphRef.current = null;
    if (!graph) return;

    graph.node.port.onmessage = null;
    graph.node.disconnect();
    graph.source.disconnect();
    graph.sink.disconnect();
    void graph.context.close().catch(() => {});
  };

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return undefined;
    }

    if (!canTranscribeLocally()) {
      setStatus("unsupported");
      return undefined;
    }

    const hasAudioTrack = localStream?.getAudioTracks?.().some((track) => track.readyState !== "ended");
    if (!hasAudioTrack) {
      fail({ code: "missing-audio-track", message: "A live microphone track is required for captions." });
      return undefined;
    }

    let cancelled = false;

    const start = async () => {
      setStatus("loading");
      decodeFailuresRef.current = 0;
      await initWorker(ensureWorker());
      if (cancelled) return;
      await setupAudioGraph(localStream, () => cancelled);
      if (!cancelled) callbacksRef.current.onStart?.();
    };

    start().catch((error) => {
      if (cancelled || error?.reported) return;
      fail({
        code: error?.code || "caption-engine-error",
        message: error?.message || "Local captions failed to start.",
      });
    });

    return () => {
      cancelled = true;
      workerRef.current?.postMessage({ type: "reset" });
      teardownAudioGraph();
    };
  }, [enabled, localStream, maxUtteranceMs]);

  // Declared after the effect above so its cleanup still has a worker to reset.
  useEffect(
    () => () => {
      initRef.current?.reject({ code: "worker-disposed", reported: true });
      initRef.current = null;
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    []
  );

  return { status };
}
