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
  const [, dispatch] = useContext(ReduxContext);
  const { joinRoomFunc, leaveRoomFunc } = useContext(SocketContext);
  api = { dispatch, joinRoomFunc, leaveRoomFunc };
  return null;
};

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
