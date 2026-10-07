import { createContext, useRef, useEffect, useReducer, useState } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import { reducerFun } from "./reducer";
import { SOCKET_EVENTS } from "./socketEvents";

export const ReduxContext = createContext();
export const SocketContext = createContext();

const initialState = {
  localStream: null,
  connections: {},
  roomID: null,
  name: "",
  messages: [],
};

const peerNameFallback = (peerID) => peerID?.slice(-4)?.toUpperCase() || "??";

export const ReduxContextWrapper = ({ children }) => {
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomIDRef = useRef(null);
  const nameRef = useRef("");
  const callsRef = useRef({});
  const [state, dispatch] = useReducer(reducerFun, initialState);
  const [peerReady, setPeerReady] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [socketError, setSocketError] = useState("");
  const [socket, setSocket] = useState(null);
  const { localStream, roomID, name } = state;

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    roomIDRef.current = roomID;
  }, [roomID]);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  // Close PeerJS calls and stop remote streams for removed peers
  useEffect(() => {
    const currentPeers = new Set(Object.keys(state.connections));
    Object.entries(callsRef.current).forEach(([peerID, call]) => {
      if (!currentPeers.has(peerID)) {
        call.close();
        delete callsRef.current[peerID];
      }
    });
  }, [state.connections]);

  // Initialize socket and peer once on mount
  useEffect(() => {
    // No fallback address: a missing URL should say so, not quietly dial localhost.
    const socketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
    if (!socketUrl) {
      setSocketError("VITE_SOCKET_URL is not set, so there is no signaling server to join through.");
      return;
    }

    peerRef.current = new Peer();
    const socketInstance = io(socketUrl);
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    peerRef.current.on("open", () => {
      setPeerReady(true);
    });

    // A reconnected client gets a fresh server-side socket that is in no room,
    // and peers have already dropped us, so rejoin and let them call back.
    socketInstance.on("connect", () => {
      setSocketReady(true);
      setSocketError("");
      const roomID = roomIDRef.current;
      if (!roomID || !peerRef.current?.id) return;
      socketInstance.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomID,
        userID: peerRef.current.id,
        userName: nameRef.current || "You",
      });
    });

    socketInstance.on("disconnect", () => setSocketReady(false));

    // Socket.IO keeps retrying after this, and "connect" clears the error.
    socketInstance.on("connect_error", () => {
      setSocketReady(false);
      setSocketError("Could not reach the signaling server.");
    });

    socketRef.current.on(SOCKET_EVENTS.USER_JOINED, ({ userID, userName }) => {
      if (!localStreamRef.current || !peerRef.current) return;
      const call = peerRef.current.call(userID, localStreamRef.current, {
        metadata: { userName: nameRef.current || "You" },
      });
      if (!call) return;
      callsRef.current[call.peer] = call;
      call.on("stream", (stream) =>
        dispatch({
          type: "ADD_CONNECTION",
          payload: {
            peer: call.peer,
            stream,
            name: userName || peerNameFallback(call.peer),
          },
        })
      );
      call.on("close", () =>
        dispatch({ type: "REMOVE_CONNECTION", payload: call.peer })
      );
    });

    peerRef.current.on("call", (call) => {
      if (!localStreamRef.current) return;
      call.answer(localStreamRef.current);
      callsRef.current[call.peer] = call;
      call.on("stream", (stream) =>
        dispatch({
          type: "ADD_CONNECTION",
          payload: {
            peer: call.peer,
            stream,
            name: call.metadata?.userName || peerNameFallback(call.peer),
          },
        })
      );
      call.on("close", () =>
        dispatch({ type: "REMOVE_CONNECTION", payload: call.peer })
      );
    });

    socketRef.current.on(SOCKET_EVENTS.USER_DISCONNECTED, ({ userID }) => {
      callsRef.current[userID]?.close();
      delete callsRef.current[userID];
      dispatch({ type: "REMOVE_CONNECTION", payload: userID });
    });

    return () => {
      socketRef.current?.off("connect");
      socketRef.current?.off("disconnect");
      socketRef.current?.off("connect_error");
      socketRef.current?.off(SOCKET_EVENTS.USER_JOINED);
      socketRef.current?.off(SOCKET_EVENTS.USER_DISCONNECTED);
      peerRef.current?.off("call");
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      Object.values(callsRef.current).forEach((call) => call.close());
      callsRef.current = {};
      setSocket(null);
      setSocketReady(false);
    };
  }, []);

  const joinRoomFunc = (roomID, userName = nameRef.current || "You") => {
    if (!socketRef.current || !peerRef.current?.id) return;
    socketRef.current.emit(SOCKET_EVENTS.JOIN_ROOM, {
      roomID,
      userID: peerRef.current.id,
      userName: userName.trim() || "You",
    });
    dispatch({ type: "SET_ROOM", payload: roomID });
  };

  const leaveRoomFunc = () => {
    const currentRoomID = roomIDRef.current;
    if (!socketRef.current || !peerRef.current?.id) return;
    if (currentRoomID) {
      socketRef.current.emit(SOCKET_EVENTS.USER_DISCONNECT, {
        userID: peerRef.current.id,
        roomID: currentRoomID,
      });
    }
    Object.values(callsRef.current).forEach((call) => call.close());
    callsRef.current = {};
    dispatch({ type: "LEAVE_ROOM" });
  };

  return (
    <ReduxContext.Provider value={[state, dispatch]}>
      <SocketContext.Provider value={{ joinRoomFunc, leaveRoomFunc, peerReady, socket, socketReady, socketError }}>
        {children}
      </SocketContext.Provider>
    </ReduxContext.Provider>
  );
};
