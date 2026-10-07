import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { SOCKET_EVENTS } from "../redux/socketEvents";
import { __testing, useRoomCaptions } from "./useRoomCaptions";

const { applyCaption, normalizeCaption, STALE_CAPTION_MS } = __testing;

const caption = (overrides = {}) => ({
  captionId: "c1",
  senderId: "peer-a",
  senderName: "Ada",
  text: "hello",
  isFinal: false,
  ...overrides,
});

const createSocket = () => {
  const handlers = {};
  return {
    id: "me",
    handlers,
    on: vi.fn((event, handler) => {
      handlers[event] = handler;
    }),
    off: vi.fn((event) => {
      delete handlers[event];
    }),
    emit: vi.fn(),
  };
};

const renderCaptions = (socket, active) =>
  renderHook((props) => useRoomCaptions(props), {
    initialProps: { socket, roomID: "room-1", senderId: socket.id, senderName: "Me", active },
  });

describe("normalizeCaption", () => {
  it("accepts a well-formed caption", () => {
    expect(normalizeCaption(caption())).toEqual(caption());
  });

  it("rejects captions without an identity or text", () => {
    expect(normalizeCaption(caption({ senderId: "" }))).toBeNull();
    expect(normalizeCaption(caption({ captionId: "" }))).toBeNull();
    expect(normalizeCaption(caption({ text: "   " }))).toBeNull();
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
    const state = applyCaption(applyCaption(empty, caption()), caption({ text: "hello world" }));
    expect(state.currentCaption.text).toBe("hello world");
    expect(state.previousCaption).toBeNull();
  });

  it("does not merge a different sender reusing the same caption id", () => {
    const state = applyCaption(applyCaption(empty, caption()), caption({ senderId: "peer-b", text: "spoofed" }));
    expect(state.currentCaption.senderId).toBe("peer-b");
    expect(state.previousCaption).toBeNull();
  });

  it("promotes only a completed caption to the previous line", () => {
    const done = caption({ isFinal: true });
    const state = applyCaption(applyCaption(empty, done), caption({ captionId: "c2", text: "second" }));
    expect(state.previousCaption.text).toBe("hello");
    expect(state.currentCaption.text).toBe("second");
  });
});

describe("useRoomCaptions", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not listen for captions while captions are off", () => {
    const socket = createSocket();
    renderCaptions(socket, false);
    expect(socket.handlers[SOCKET_EVENTS.RECEIVE_CAPTION]).toBeUndefined();
  });

  it("shows captions from a sender who left and rejoined", () => {
    const socket = createSocket();
    const { result, rerender } = renderCaptions(socket, true);
    const receive = (c) => act(() => socket.handlers[SOCKET_EVENTS.RECEIVE_CAPTION](c));

    receive(caption({ captionId: "first-visit", text: "before", isFinal: true }));
    rerender({ socket, roomID: "room-1", senderId: socket.id, senderName: "Me", active: true });
    receive(caption({ captionId: "second-visit", text: "after" }));

    expect(result.current.currentCaption.text).toBe("after");
  });

  it("settles a live line that stops updating", () => {
    const socket = createSocket();
    const { result } = renderCaptions(socket, true);

    act(() => socket.handlers[SOCKET_EVENTS.RECEIVE_CAPTION](caption()));
    expect(result.current.currentCaption.isFinal).toBe(false);

    act(() => vi.advanceTimersByTime(STALE_CAPTION_MS));
    expect(result.current.currentCaption.isFinal).toBe(true);
  });

  it("settles our live line for everyone when captions are turned off", () => {
    const socket = createSocket();
    const { result, rerender } = renderCaptions(socket, true);

    act(() => result.current.publishCaption({ text: "half a sente", isFinal: false }));
    rerender({ socket, roomID: "room-1", senderId: socket.id, senderName: "Me", active: false });

    const [event, payload] = socket.emit.mock.calls.at(-1);
    expect(event).toBe(SOCKET_EVENTS.SEND_CAPTION);
    expect(payload.caption).toMatchObject({ text: "half a sente", isFinal: true });
    expect(result.current.currentCaption).toBeNull();
  });

  it("does not publish while captions are off", () => {
    const socket = createSocket();
    const { result } = renderCaptions(socket, false);
    act(() => result.current.publishCaption({ text: "hello", isFinal: true }));
    expect(socket.emit).not.toHaveBeenCalled();
  });
});
