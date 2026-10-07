import { beforeEach, describe, expect, it, vi } from "vitest";

// Each decode stays pending until the test resolves it, which simulates a
// decoder that is slower than real time.
const { decodes } = vi.hoisted(() => ({ decodes: [] }));

vi.mock("@huggingface/transformers", () => ({
  env: {},
  pipeline: vi.fn(async () => (audio) => new Promise((resolve) => decodes.push({ audio, resolve }))),
}));

const CHUNK = 2048; // 128 ms at 16 kHz
const speech = () => new Float32Array(CHUNK).fill(0.1);
const silence = () => new Float32Array(CHUNK);
const repeat = (count, make) => Array.from({ length: count }, make);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let posted;
const send = (data) => self.onmessage({ data });
const feed = (chunks) => chunks.forEach((audio) => send({ type: "audio", audio, sampleRate: 16000 }));
const sent = (type) => posted.mock.calls.map(([message]) => message).filter((m) => m.type === type);
const utterance = () => [...repeat(4, speech), ...repeat(4, silence)];

const resolveNext = async (text) => {
  await vi.waitFor(() => expect(decodes.length).toBeGreaterThan(0));
  decodes.shift().resolve({ text });
  await tick();
};

describe("captionAsrWorker", () => {
  beforeEach(async () => {
    vi.resetModules();
    decodes.length = 0;
    posted = vi.fn();
    self.postMessage = posted;
    await import("./captionAsrWorker.js");
    await send({ type: "init" });
  });

  it("reports ready once the model loads", () => {
    expect(sent("ready")).toHaveLength(1);
  });

  it("keeps every final when decoding falls behind", async () => {
    feed(utterance());
    await tick();
    feed(utterance());
    feed(utterance());

    await resolveNext("one");
    await resolveNext("two");
    await resolveNext("three");

    expect(sent("final").map((m) => m.text)).toEqual(["one", "two", "three"]);
  });

  it("does not decode a burst too short to be speech", async () => {
    feed([speech(), ...repeat(6, silence)]);
    await tick();
    expect(decodes).toHaveLength(0);
  });

  it("drops a partial whose utterance has already ended", async () => {
    feed(repeat(10, speech));
    await tick();
    expect(decodes).toHaveLength(1);

    feed(repeat(4, silence));
    await resolveNext("stale partial");
    await resolveNext("final text");

    expect(sent("partial")).toHaveLength(0);
    expect(sent("final").map((m) => m.text)).toEqual(["final text"]);
  });

  it("reports a failed decode without stopping later ones", async () => {
    feed(utterance());
    await vi.waitFor(() => expect(decodes).toHaveLength(1));
    decodes.shift().resolve(Promise.reject(new Error("device lost")));
    await tick();
    feed(utterance());
    await resolveNext("still working");

    expect(sent("decode-error")).toHaveLength(1);
    expect(sent("final").map((m) => m.text)).toEqual(["still working"]);
  });

  it("downsamples device-rate audio before detecting speech", async () => {
    const chunk48k = () => new Float32Array(CHUNK * 3).fill(0.1);
    repeat(4, chunk48k).forEach((audio) => send({ type: "audio", audio, sampleRate: 48000 }));
    feed(repeat(4, silence));
    await vi.waitFor(() => expect(decodes).toHaveLength(1));

    const decoded = decodes[0].audio;
    expect(decoded.length).toBe(CHUNK * 8);
    expect(decoded[0]).toBeCloseTo(0.1);
  });
});
