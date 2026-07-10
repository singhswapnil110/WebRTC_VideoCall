import React, { useContext, useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ReduxContext,
  ReduxContextWrapper,
  SocketContext,
} from "./reduxContextWrapper";
import { SOCKET_EVENTS } from "./socketEvents";

const { socketHandlers, peerHandlers, mockState } = vi.hoisted(() => ({
  socketHandlers: new Map(),
  peerHandlers: new Map(),
  mockState: { outgoingCall: null },
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    id: "socket-local",
    on: vi.fn((event, handler) => socketHandlers.set(event, handler)),
    off: vi.fn((event) => socketHandlers.delete(event)),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock("peerjs", () => ({
  default: vi.fn(() => ({
    id: "peer-local",
    on: vi.fn((event, handler) => peerHandlers.set(event, handler)),
    off: vi.fn((event) => peerHandlers.delete(event)),
    call: vi.fn(() => mockState.outgoingCall),
    destroy: vi.fn(),
  })),
}));

const createCall = (peer, metadata = {}) => {
  const handlers = new Map();
  return {
    peer,
    metadata,
    answer: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event, handler) => handlers.set(event, handler)),
    emitStream: (stream) => handlers.get("stream")?.(stream),
  };
};

const createStream = () => ({
  getTracks: () => [],
});

const Harness = ({ onReady, onConnections }) => {
  const [state, dispatch] = useContext(ReduxContext);
  const { joinRoomFunc, peerReady } = useContext(SocketContext);

  useEffect(() => {
    dispatch({ type: "SET_LOCAL_STREAM", payload: createStream() });
  }, [dispatch]);

  useEffect(() => {
    onConnections(state.connections);
  }, [onConnections, state.connections]);

  useEffect(() => {
    if (peerReady) onReady({ joinRoomFunc });
  }, [joinRoomFunc, onReady, peerReady]);

  return null;
};

describe("ReduxContextWrapper peer names", () => {
  beforeEach(() => {
    socketHandlers.clear();
    peerHandlers.clear();
    mockState.outgoingCall = createCall("remote-peer-1234", {
      userName: "Local Caller",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses the joined user name for outgoing calls", async () => {
    const onConnections = vi.fn();
    const onReady = vi.fn();
    render(
      <ReduxContextWrapper>
        <Harness onReady={onReady} onConnections={onConnections} />
      </ReduxContextWrapper>
    );

    act(() => peerHandlers.get("open")?.());
    await waitFor(() => expect(onReady).toHaveBeenCalled());

    act(() => {
      socketHandlers.get(SOCKET_EVENTS.USER_JOINED)?.({
        userID: "remote-peer-1234",
        userName: "Remote User",
      });
    });

    const remoteStream = createStream();
    act(() => mockState.outgoingCall.emitStream(remoteStream));

    await waitFor(() => {
      expect(onConnections).toHaveBeenLastCalledWith({
        "remote-peer-1234": {
          peer: "remote-peer-1234",
          remoteStream,
          name: "Remote User",
        },
      });
    });
  });

  it("falls back to the peer suffix for outgoing calls when the joined user name is missing", async () => {
    const onConnections = vi.fn();
    const onReady = vi.fn();
    render(
      <ReduxContextWrapper>
        <Harness onReady={onReady} onConnections={onConnections} />
      </ReduxContextWrapper>
    );

    act(() => peerHandlers.get("open")?.());
    await waitFor(() => expect(onReady).toHaveBeenCalled());

    act(() => {
      socketHandlers.get(SOCKET_EVENTS.USER_JOINED)?.({
        userID: "remote-peer-1234",
        userName: "",
      });
    });

    const remoteStream = createStream();
    act(() => mockState.outgoingCall.emitStream(remoteStream));

    await waitFor(() => {
      expect(onConnections).toHaveBeenLastCalledWith({
        "remote-peer-1234": {
          peer: "remote-peer-1234",
          remoteStream,
          name: "1234",
        },
      });
    });
  });

  it("falls back to the peer suffix when incoming call metadata has no user name", async () => {
    const onConnections = vi.fn();
    const onReady = vi.fn();
    const incomingCall = createCall("incoming-peer-abcd");
    render(
      <ReduxContextWrapper>
        <Harness onReady={onReady} onConnections={onConnections} />
      </ReduxContextWrapper>
    );

    act(() => peerHandlers.get("open")?.());
    await waitFor(() => expect(onReady).toHaveBeenCalled());

    act(() => {
      peerHandlers.get("call")?.(incomingCall);
    });

    const remoteStream = createStream();
    act(() => incomingCall.emitStream(remoteStream));

    await waitFor(() => {
      expect(onConnections).toHaveBeenLastCalledWith({
        "incoming-peer-abcd": {
          peer: "incoming-peer-abcd",
          remoteStream,
          name: "ABCD",
        },
      });
    });
  });
});
