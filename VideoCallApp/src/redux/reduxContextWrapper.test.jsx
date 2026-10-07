import React, { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { ReduxContext, ReduxContextWrapper, SocketContext } from "./reduxContextWrapper";
import { SOCKET_EVENTS } from "./socketEvents";

const { mockSocket, mockIo } = vi.hoisted(() => {
  const handlers = {};
  return {
    mockIo: vi.fn(),
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
    on() {}
    off() {}
    destroy() {}
  },
}));

let api;
const Probe = () => {
  const [, dispatch] = useContext(ReduxContext);
  const { joinRoomFunc, leaveRoomFunc, socketReady, socketError } = useContext(SocketContext);
  api = { dispatch, joinRoomFunc, leaveRoomFunc, socketReady, socketError };
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

describe("ReduxContextWrapper signaling connection", () => {
  const renderWrapper = () =>
    render(
      <ReduxContextWrapper>
        <Probe />
      </ReduxContextWrapper>
    );

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
