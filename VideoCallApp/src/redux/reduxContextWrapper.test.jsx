import React, { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { ReduxContext, ReduxContextWrapper, SocketContext } from "./reduxContextWrapper";
import { SOCKET_EVENTS } from "./socketEvents";

const { mockSocket, mockIo, peerHandlers } = vi.hoisted(() => {
  const handlers = {};
  return {
    mockIo: vi.fn(),
    peerHandlers: {},
    mockSocket: {
      handlers,
      on: (event, handler) => {
        handlers[event] = handler;
      },
      off: (event) => {
        delete handlers[event];
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
    },
  };
});

vi.mock("socket.io-client", () => ({ io: mockIo }));

beforeEach(() => {
  vi.stubEnv("VITE_SOCKET_URL", "http://signal.test");
  mockIo.mockReset().mockReturnValue(mockSocket);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

vi.mock("peerjs", () => ({
  default: class {
    id = "peer-1";
    on(event, handler) {
      peerHandlers[event] = handler;
    }
    off() {}
    destroy() {}
  },
}));

let api;
const Probe = () => {
  const [state, dispatch] = useContext(ReduxContext);
  const { joinRoomFunc, leaveRoomFunc, setRaisedHand, syncLocalStream, replaceOutgoingTrack, socketReady, socketError } =
    useContext(SocketContext);
  api = { state, dispatch, joinRoomFunc, leaveRoomFunc, setRaisedHand, syncLocalStream, replaceOutgoingTrack, socketReady, socketError };
  return null;
};

const renderWrapper = () =>
  render(
    <ReduxContextWrapper>
      <Probe />
    </ReduxContextWrapper>
  );

const joinEmits = () => mockSocket.emit.mock.calls.filter(([event]) => event === SOCKET_EVENTS.JOIN_ROOM);
const reconnect = () => act(() => mockSocket.handlers.connect());

describe("ReduxContextWrapper socket reconnect", () => {
  it("rejoins the current room when the socket reconnects", () => {
    render(
      <ReduxContextWrapper>
        <Probe />
      </ReduxContextWrapper>
    );

    reconnect();
    expect(joinEmits()).toHaveLength(0);

    act(() => {
      api.dispatch({ type: "SET_NAME", payload: "Ada" });
      api.joinRoomFunc("room-1", "Ada");
    });
    mockSocket.emit.mockClear();

    reconnect();
    expect(joinEmits()).toEqual([
      [SOCKET_EVENTS.JOIN_ROOM, { roomID: "room-1", userID: "peer-1", userName: "Ada" }],
    ]);

    act(() => api.leaveRoomFunc());
    mockSocket.emit.mockClear();

    reconnect();
    expect(joinEmits()).toHaveLength(0);
  });
});

describe("ReduxContextWrapper raised hands", () => {
  const hand = { userID: "peer-2", userName: "Bo", raised: true, timestamp: 1 };
  const fire = (event, payload) => act(() => mockSocket.handlers[event](payload));

  it("sends only the room and the raised flag; the server stamps identity", () => {
    renderWrapper();
    act(() => api.joinRoomFunc("room-1", "Ada"));
    mockSocket.emit.mockClear();

    act(() => api.setRaisedHand(true));

    expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.SET_RAISED_HAND, { roomID: "room-1", raised: true });
  });

  it("does not send a hand outside a room", () => {
    renderWrapper();
    mockSocket.emit.mockClear();
    act(() => api.setRaisedHand(true));
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("tracks room hand state and updates from the server", () => {
    renderWrapper();

    fire(SOCKET_EVENTS.ROOM_HAND_STATE, { hands: { "peer-2": hand } });
    expect(api.state.raisedHands).toEqual({ "peer-2": hand });

    fire(SOCKET_EVENTS.RAISED_HAND_UPDATED, { userID: "peer-3", hand: { ...hand, userID: "peer-3" } });
    expect(Object.keys(api.state.raisedHands)).toEqual(["peer-2", "peer-3"]);

    fire(SOCKET_EVENTS.RAISED_HAND_UPDATED, { userID: "peer-3", hand: null });
    expect(Object.keys(api.state.raisedHands)).toEqual(["peer-2"]);

    // Leaving is announced by the server lowering the hand, not by the disconnect itself.
    fire(SOCKET_EVENTS.USER_DISCONNECTED, { userID: "peer-2" });
    expect(api.state.raisedHands).toEqual({ "peer-2": hand });
  });
});

describe("ReduxContextWrapper calls", () => {
  const transceiver = (kind) => ({
    receiver: { track: { kind } },
    sender: { track: { kind }, replaceTrack: vi.fn(async function (track) { this.track = track; }) },
  });

  const answerCall = (peer, transceivers = []) => {
    const callHandlers = {};
    const call = {
      peer,
      answer: vi.fn(),
      close: vi.fn(),
      on: (event, handler) => {
        callHandlers[event] = handler;
      },
      peerConnection: { getTransceivers: () => transceivers },
    };
    act(() => api.syncLocalStream({ id: "local" }));
    act(() => peerHandlers.call(call));
    return callHandlers;
  };

  it("swaps tracks on the right sender even after one was nulled", async () => {
    renderWrapper();
    const audio = transceiver("audio");
    const video = transceiver("video");
    answerCall("peer-2", [audio, video]);

    await act(() => api.replaceOutgoingTrack("audio", null));
    const screen = { kind: "video" };
    await act(() => api.replaceOutgoingTrack("video", screen));

    expect(audio.sender.replaceTrack).toHaveBeenCalledTimes(1);
    expect(audio.sender.replaceTrack).toHaveBeenCalledWith(null);
    expect(video.sender.replaceTrack).toHaveBeenCalledWith(screen);
  });

  it("keeps a raised hand when only the call drops", () => {
    renderWrapper();
    const hand = { userID: "peer-2", userName: "Bo", raised: true, timestamp: 1 };
    const callHandlers = answerCall("peer-2");
    act(() => mockSocket.handlers[SOCKET_EVENTS.ROOM_HAND_STATE]({ hands: { "peer-2": hand } }));

    act(() => callHandlers.close());

    expect(api.state.raisedHands).toEqual({ "peer-2": hand });
  });
});

describe("ReduxContextWrapper signaling connection", () => {
  it("does not fall back to a default server when VITE_SOCKET_URL is missing", () => {
    vi.stubEnv("VITE_SOCKET_URL", " ");
    renderWrapper();

    expect(mockIo).not.toHaveBeenCalled();
    expect(api.socketReady).toBe(false);
    expect(api.socketError).toMatch(/VITE_SOCKET_URL/);
  });

  it("connects to the configured server and reports its state", () => {
    renderWrapper();
    expect(mockIo).toHaveBeenCalledWith("http://signal.test");
    expect(api.socketReady).toBe(false);
    expect(api.socketError).toBe("");

    act(() => mockSocket.handlers.connect_error(new Error("refused")));
    expect(api.socketReady).toBe(false);
    expect(api.socketError).toMatch(/Could not reach/);

    act(() => mockSocket.handlers.connect());
    expect(api.socketReady).toBe(true);
    expect(api.socketError).toBe("");

    act(() => mockSocket.handlers.disconnect());
    expect(api.socketReady).toBe(false);
  });
});
