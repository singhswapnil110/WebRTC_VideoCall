import { describe, expect, it } from "vitest";
import { __testing } from "./useRoomCaptions";

const { applyCaption, normalizeCaption } = __testing;

const caption = (overrides = {}) => ({
  captionId: "c1",
  senderId: "peer-a",
  senderName: "Ada",
  text: "hello",
  isFinal: false,
  seq: 1,
  ...overrides,
});

describe("normalizeCaption", () => {
  it("accepts a well-formed caption", () => {
    expect(normalizeCaption(caption())).toMatchObject({
      captionId: "c1",
      senderId: "peer-a",
      senderName: "Ada",
      text: "hello",
      isFinal: false,
      seq: 1,
    });
  });

  it("rejects captions without an identity, text, or usable seq", () => {
    expect(normalizeCaption(caption({ senderId: "" }))).toBeNull();
    expect(normalizeCaption(caption({ captionId: "" }))).toBeNull();
    expect(normalizeCaption(caption({ text: "   " }))).toBeNull();
    expect(normalizeCaption(caption({ seq: 0 }))).toBeNull();
    expect(normalizeCaption(caption({ seq: 1.5 }))).toBeNull();
    expect(normalizeCaption(null)).toBeNull();
  });

  it("falls back to a generic name and clamps long text", () => {
    expect(normalizeCaption(caption({ senderName: "  " })).senderName).toBe("Speaker");
    expect(normalizeCaption(caption({ text: "x".repeat(900) })).text).toHaveLength(500);
  });
});

describe("applyCaption", () => {
  const empty = { currentCaption: null, previousCaption: null };

  it("merges updates to the same utterance from the same sender", () => {
    const first = normalizeCaption(caption());
    const update = normalizeCaption(caption({ text: "hello world", seq: 2 }));
    const state = applyCaption(applyCaption(empty, first), update);

    expect(state.currentCaption.text).toBe("hello world");
    expect(state.previousCaption).toBeNull();
  });

  it("does not merge a different sender reusing the same caption id", () => {
    const mine = normalizeCaption(caption());
    const impostor = normalizeCaption(caption({ senderId: "peer-b", senderName: "Eve", text: "spoofed" }));
    const state = applyCaption(applyCaption(empty, mine), impostor);

    expect(state.currentCaption.senderId).toBe("peer-b");
    expect(state.previousCaption).toBeNull();
  });

  it("promotes only a completed caption to the previous line", () => {
    const done = normalizeCaption(caption({ isFinal: true }));
    const next = normalizeCaption(caption({ captionId: "c2", text: "second", seq: 2 }));
    const state = applyCaption(applyCaption(empty, done), next);

    expect(state.previousCaption.text).toBe("hello");
    expect(state.currentCaption.text).toBe("second");
  });
});
