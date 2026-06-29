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

export const ReduxContextWrapper = ({ children }) => {
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomIDRef = useRef(null);
  const callsRef = useRef({});
  const [state, dispatch] = useReducer(reducerFun, initialState);
  const [peerReady, setPeerReady] = useState(false);
  const [socket, setSocket] = useState(null);
  const { localStream, roomID } = state;

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    roomIDRef.current = roomID;
  }, [roomID]);

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
    peerRef.current = new Peer();
    const socketInstance = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:8002"
    );
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    peerRef.current.on("open", () => {
      setPeerReady(true);
    });

    socketRef.current.on(SOCKET_EVENTS.USER_JOINED, ({ userID }) => {
      if (!localStreamRef.current || !peerRef.current) return;
      const call = peerRef.current.call(userID, localStreamRef.current);
      if (!call) return;
      callsRef.current[call.peer] = call;
      call.on("stream", (stream) =>
        dispatch({ type: "ADD_CONNECTION", payload: { peer: call.peer, stream } })
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
        dispatch({ type: "ADD_CONNECTION", payload: { peer: call.peer, stream } })
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
      socketRef.current?.off(SOCKET_EVENTS.USER_JOINED);
      socketRef.current?.off(SOCKET_EVENTS.USER_DISCONNECTED);
      peerRef.current?.off("call");
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      Object.values(callsRef.current).forEach((call) => call.close());
      callsRef.current = {};
      setSocket(null);
    };
  }, []);

  const joinRoomFunc = (roomID) => {
    if (!socketRef.current || !peerRef.current?.id) return;
    socketRef.current.emit(SOCKET_EVENTS.JOIN_ROOM, {
      roomID,
      userID: peerRef.current.id,
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
      <SocketContext.Provider value={{ joinRoomFunc, leaveRoomFunc, peerReady, socket }}>
        {children}
      </SocketContext.Provider>
    </ReduxContext.Provider>
  );
};
