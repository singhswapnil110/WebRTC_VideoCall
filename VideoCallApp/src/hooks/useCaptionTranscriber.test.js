import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCaptionTranscriber } from "./useCaptionTranscriber";

class MockWorker {
  static instances = [];

  constructor() {
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    this.onmessage = null;
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
    this.createMediaStreamSource = vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    this.createGain = vi.fn(() => ({
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    MockAudioContext.instances.push(this);
  }
}

class MockAudioWorkletNode {
  static instances = [];

  constructor() {
    this.port = {
      onmessage: null,
      postMessage: vi.fn(),
    };
    this.connect = vi.fn();
    this.disconnect = vi.fn();
    MockAudioWorkletNode.instances.push(this);
  }
}

const createStream = () => ({
  getAudioTracks: () => [{ readyState: "live" }],
});

describe("useCaptionTranscriber", () => {
  beforeEach(() => {
    MockWorker.instances = [];
    MockAudioContext.instances = [];
    MockAudioWorkletNode.instances = [];
    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = undefined;
    globalThis.Worker = MockWorker;
    globalThis.AudioWorkletNode = MockAudioWorkletNode;
    Object.defineProperty(globalThis.navigator, "gpu", {
      configurable: true,
      value: undefined,
    });
  });

  it("reports support when worker and audio worklet are available", () => {
    const { result } = renderHook(() => useCaptionTranscriber({ enabled: false }));
    expect(result.current.supported).toBe(true);
  });

  it("reports unsupported when worker support is missing", () => {
    globalThis.Worker = undefined;
    const { result } = renderHook(() => useCaptionTranscriber({ enabled: false }));
    expect(result.current.supported).toBe(false);
  });

  it("initializes the worker and audio graph when enabled", async () => {
    renderHook(() => useCaptionTranscriber({ enabled: true, localStream: createStream() }));

    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0];

    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "init", maxUtteranceMs: 4000 })
    );

    worker.emit({ type: "ready" });

    await waitFor(() => expect(MockAudioContext.instances).toHaveLength(1));
    expect(MockAudioContext.instances[0].audioWorklet.addModule).toHaveBeenCalledTimes(1);
    expect(MockAudioWorkletNode.instances).toHaveLength(1);
  });

  it("maps worker partial and final events", async () => {
    const onResult = vi.fn();

    renderHook(() =>
      useCaptionTranscriber({
        enabled: true,
        localStream: createStream(),
        onResult,
      })
    );

    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0];
    worker.emit({ type: "ready" });

    await waitFor(() => expect(MockAudioContext.instances).toHaveLength(1));

    worker.emit({ type: "partial", text: "hello" });
    worker.emit({ type: "final", text: "hello world" });

    expect(onResult).toHaveBeenNthCalledWith(1, {
      text: "hello",
      isFinal: false,
      detectedLanguage: undefined,
    });
    expect(onResult).toHaveBeenNthCalledWith(2, {
      text: "hello world",
      isFinal: true,
      detectedLanguage: undefined,
    });
  });

  it("reports loading status while worker initializes", async () => {
    const { result } = renderHook(() =>
      useCaptionTranscriber({ enabled: true, localStream: createStream() })
    );

    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    await waitFor(() => expect(result.current.status).toBe("loading"));
  });

  it("resets the worker and closes the audio graph on unmount", async () => {
    const { unmount } = renderHook(() =>
      useCaptionTranscriber({ enabled: true, localStream: createStream() })
    );

    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0];
    worker.emit({ type: "ready" });

    await waitFor(() => expect(MockAudioContext.instances).toHaveLength(1));
    const context = MockAudioContext.instances[0];

    unmount();

    expect(worker.postMessage).toHaveBeenCalledWith({ type: "reset" });
    await waitFor(() => expect(context.close).toHaveBeenCalledTimes(1));
  });
});
