import { describe, it, expect } from "vitest";
import { reducerFun } from "./reducer";

const initialState = {
  localStream: null,
  connections: {},
  roomID: null,
  name: "",
  messages: [],
  raisedHands: {},
};

const mockStream = () => {
  const tracks = [
    { enabled: true, kind: "audio", stop: () => {} },
    { enabled: true, kind: "video", stop: () => {} },
  ];
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
    getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
  };
};

describe("reducer", () => {
  it("sets local stream", () => {
    const stream = mockStream();
    const next = reducerFun(initialState, { type: "SET_LOCAL_STREAM", payload: stream });
    expect(next.localStream).toBe(stream);
  });

  it("adds and removes connections without mutations", () => {
    const stream = mockStream();
    const state1 = reducerFun(initialState, {
      type: "ADD_CONNECTION",
      payload: { peer: "peer-abc", stream, name: "Alice" },
    });
    expect(state1.connections["peer-abc"]).toEqual({ peer: "peer-abc", remoteStream: stream, name: "Alice" });

    const state2 = reducerFun(state1, {
      type: "REMOVE_CONNECTION",
      payload: "peer-abc",
    });
    expect(state2.connections).not.toHaveProperty("peer-abc");
    expect(state1.connections).toHaveProperty("peer-abc");
  });

  it("sets and clears raised hands", () => {
    const withHand = reducerFun(initialState, {
      type: "SET_RAISED_HAND",
      payload: {
        userID: "peer-abc",
        hand: { userID: "peer-abc", userName: "Alice", raised: true, timestamp: 123 },
      },
    });

    expect(withHand.raisedHands["peer-abc"]).toEqual({
      userID: "peer-abc",
      userName: "Alice",
      raised: true,
      timestamp: 123,
    });

    const withRoomState = reducerFun(withHand, {
      type: "SET_RAISED_HANDS",
      payload: {
        "peer-def": { userID: "peer-def", userName: "Bob", raised: true, timestamp: 456 },
      },
    });
    expect(withRoomState.raisedHands).toEqual({
      "peer-def": { userID: "peer-def", userName: "Bob", raised: true, timestamp: 456 },
    });

    const cleared = reducerFun(withRoomState, {
      type: "CLEAR_RAISED_HAND",
      payload: "peer-def",
    });
    expect(cleared.raisedHands).toEqual({});
  });

  it("leaves room and clears state without side effects", () => {
    const stream = mockStream();
    const state = reducerFun(
      {
        ...initialState,
        roomID: "room-123",
        connections: { "peer-abc": { peer: "peer-abc", remoteStream: stream, name: "Alice" } },
        messages: [{ id: "1", text: "hi" }],
        raisedHands: {
          "peer-abc": { userID: "peer-abc", userName: "Alice", raised: true, timestamp: 1 },
        },
      },
      { type: "LEAVE_ROOM" }
    );
    expect(state.roomID).toBeNull();
    expect(state.connections).toEqual({});
    expect(state.messages).toEqual([]);
    expect(state.raisedHands).toEqual({});
    // Side effects should be handled by the wrapper, not the reducer
    expect(state.connections["peer-abc"]).toBeUndefined();
  });

  it("sets room and name", () => {
    const withRoom = reducerFun(initialState, {
      type: "SET_ROOM",
      payload: "room-123",
    });
    expect(withRoom.roomID).toBe("room-123");

    const withName = reducerFun(withRoom, {
      type: "SET_NAME",
      payload: "Swapnil",
    });
    expect(withName.name).toBe("Swapnil");
  });

  it("adds messages and keeps sender identity", () => {
    const state1 = reducerFun(initialState, {
      type: "ADD_MESSAGE",
      payload: { id: "1", senderId: "a", senderName: "Alice", text: "hello", me: true },
    });
    expect(state1.messages).toHaveLength(1);
    expect(state1.messages[0].me).toBe(true);

    const state2 = reducerFun(state1, {
      type: "ADD_MESSAGE",
      payload: { id: "2", senderId: "b", senderName: "Bob", text: "hi", me: false },
    });
    expect(state2.messages).toHaveLength(2);
    expect(state2.messages[1].me).toBe(false);
  });
});
