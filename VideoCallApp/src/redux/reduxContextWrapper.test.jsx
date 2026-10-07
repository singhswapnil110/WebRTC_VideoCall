import React, { useContext } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { ReduxContext, ReduxContextWrapper, SocketContext } from "./reduxContextWrapper";
import { SOCKET_EVENTS } from "./socketEvents";

const { mockSocket } = vi.hoisted(() => {
  const handlers = {};
  return {
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

vi.mock("socket.io-client", () => ({ io: () => mockSocket }));

vi.mock("peerjs", () => ({
  default: class {
    id = "peer-1";
    on() {}
    off() {}
    destroy() {}
  },
}));

let api;
const Probe = () => {
  const [state, dispatch] = useContext(ReduxContext);
  const { joinRoomFunc, leaveRoomFunc, setRaisedHand } = useContext(SocketContext);
  api = { state, dispatch, joinRoomFunc, leaveRoomFunc, setRaisedHand };
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

  it("tracks room hand state, updates, and clears a hand when that user leaves", () => {
    renderWrapper();

    fire(SOCKET_EVENTS.ROOM_HAND_STATE, { hands: { "peer-2": hand } });
    expect(api.state.raisedHands).toEqual({ "peer-2": hand });

    fire(SOCKET_EVENTS.RAISED_HAND_UPDATED, { userID: "peer-3", hand: { ...hand, userID: "peer-3" } });
    expect(Object.keys(api.state.raisedHands)).toEqual(["peer-2", "peer-3"]);

    fire(SOCKET_EVENTS.RAISED_HAND_UPDATED, { userID: "peer-3", hand: null });
    expect(Object.keys(api.state.raisedHands)).toEqual(["peer-2"]);

    fire(SOCKET_EVENTS.USER_DISCONNECTED, { userID: "peer-2" });
    expect(api.state.raisedHands).toEqual({});
  });
});
