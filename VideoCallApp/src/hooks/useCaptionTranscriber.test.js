import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCaptionTranscriber } from "./useCaptionTranscriber";

class MockWorker {
  static instances = [];

  constructor() {
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    this.onmessage = null;
    this.onerror = null;
    MockWorker.instances.push(this);
  }

  emit(data) {
    this.onmessage?.({ data });
  }
}

class MockAudioContext {
  static instances = [];

  constructor() {
    this.state = "running";
    this.sampleRate = 16000;
    this.destination = {};
    this.audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
    this.resume = vi.fn().mockResolvedValue(undefined);
    this.close = vi.fn().mockResolvedValue(undefined);
    this.createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
    this.createGain = vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }));
    MockAudioContext.instances.push(this);
  }
}

class MockAudioWorkletNode {
  static instances = [];

  constructor() {
    this.port = { onmessage: null, postMessage: vi.fn() };
    this.connect = vi.fn();
    this.disconnect = vi.fn();
    MockAudioWorkletNode.instances.push(this);
  }
}

const createStream = () => ({
  getAudioTracks: () => [{ readyState: "live" }],
});

// Created once per hook, as in the app where the stream lives in state; a new
// object on every render would restart the engine each time.
const renderTranscriber = (props) => {
  const localStream = createStream();
  return renderHook(() => useCaptionTranscriber({ enabled: true, localStream, ...props }));
};

const startReady = async (props = {}) => {
  const hook = renderTranscriber(props);
  await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
  const worker = MockWorker.instances[0];
  act(() => worker.emit({ type: "ready" }));
  await waitFor(() => expect(MockAudioWorkletNode.instances).toHaveLength(1));
  return { ...hook, worker };
};

describe("useCaptionTranscriber", () => {
  beforeEach(() => {
    MockWorker.instances = [];
    MockAudioContext.instances = [];
    MockAudioWorkletNode.instances = [];
    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = undefined;
    globalThis.Worker = MockWorker;
    globalThis.AudioWorkletNode = MockAudioWorkletNode;
  });

  it("does not spawn the worker until captions are enabled", () => {
    renderHook(() => useCaptionTranscriber({ enabled: false, localStream: createStream() }));
    expect(MockWorker.instances).toHaveLength(0);
  });

  it("reports unsupported without raising an error when the browser lacks support", () => {
    globalThis.Worker = undefined;
    const onError = vi.fn();
    const { result } = renderTranscriber({ onError });
    expect(result.current.status).toBe("unsupported");
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports loading while the worker initializes", async () => {
    const { result } = renderTranscriber();
    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    expect(MockWorker.instances[0].postMessage).toHaveBeenCalledWith({ type: "init", maxUtteranceMs: 4000 });
    expect(result.current.status).toBe("loading");
  });

  it("opens the audio graph at 16 kHz once the worker is ready", async () => {
    const { result } = await startReady();
    expect(MockAudioContext.instances).toHaveLength(1);
    expect(MockAudioContext.instances[0].audioWorklet.addModule).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("ready");
  });

  it("maps worker partial and final events", async () => {
    const onResult = vi.fn();
    const { worker } = await startReady({ onResult });

    act(() => {
      worker.emit({ type: "partial", text: "hello" });
      worker.emit({ type: "final", text: "hello world" });
    });

    expect(onResult).toHaveBeenNthCalledWith(1, { text: "hello", isFinal: false });
    expect(onResult).toHaveBeenNthCalledWith(2, { text: "hello world", isFinal: true });
  });

  it("surfaces a worker that fails to load instead of loading forever", async () => {
    const onError = vi.fn();
    const { result } = renderTranscriber({ onError });
    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0];

    act(() => worker.onerror({ preventDefault: vi.fn() }));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "worker-failed" }));
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("tolerates occasional decode errors but fails on a sustained run", async () => {
    const onError = vi.fn();
    const { result, worker } = await startReady({ onError });

    act(() => {
      worker.emit({ type: "decode-error", message: "blip" });
      worker.emit({ type: "final", text: "recovered" });
      worker.emit({ type: "decode-error", message: "blip" });
      worker.emit({ type: "decode-error", message: "blip" });
    });
    expect(result.current.status).toBe("ready");
    expect(onError).not.toHaveBeenCalled();

    act(() => worker.emit({ type: "decode-error", message: "gone" }));
    expect(result.current.status).toBe("error");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "transcription-failed" }));
  });

  it("resets the worker and closes the audio graph on unmount", async () => {
    const { unmount, worker } = await startReady();
    const context = MockAudioContext.instances[0];

    unmount();

    expect(worker.postMessage).toHaveBeenCalledWith({ type: "reset" });
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(worker.terminate).toHaveBeenCalled();
  });
});
