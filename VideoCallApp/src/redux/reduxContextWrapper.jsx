import { createContext, useRef, useEffect, useReducer, useState, useCallback } from "react";
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
  raisedHands: {},
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
  const [peerID, setPeerID] = useState(null);
  const [socket, setSocket] = useState(null);
  const { localStream, roomID, name } = state;

  const syncLocalStream = useCallback((stream) => {
    localStreamRef.current = stream;
    dispatch({ type: "SET_LOCAL_STREAM", payload: stream });
  }, []);

  // Swaps the track on every open call in place, so screen share and device
  // changes do not renegotiate or drop the call.
  const replaceOutgoingTrack = useCallback(async (kind, nextTrack) => {
    const swaps = Object.values(callsRef.current).map(async (call) => {
      // Matched by the receiver's kind, which stays set after a sender's track is nulled.
      const sender = call.peerConnection
        ?.getTransceivers?.()
        ?.find((transceiver) => transceiver.receiver.track?.kind === kind)?.sender;
      if (sender) await sender.replaceTrack(nextTrack || null);
    });
    await Promise.all(swaps);
  }, []);

  const setRaisedHand = useCallback((raised) => {
    const currentRoomID = roomIDRef.current;
    if (!socketRef.current || !currentRoomID) return;
    socketRef.current.emit(SOCKET_EVENTS.SET_RAISED_HAND, { roomID: currentRoomID, raised });
  }, []);

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
    peerRef.current = new Peer();
    const socketInstance = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:8002"
    );
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    peerRef.current.on("open", (id) => {
      setPeerReady(true);
      setPeerID(id);
    });

    // A reconnected client gets a fresh server-side socket that is in no room,
    // and peers have already dropped us, so rejoin and let them call back.
    socketInstance.on("connect", () => {
      const roomID = roomIDRef.current;
      if (!roomID || !peerRef.current?.id) return;
      socketInstance.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomID,
        userID: peerRef.current.id,
        userName: nameRef.current || "You",
      });
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

    socketRef.current.on(SOCKET_EVENTS.ROOM_HAND_STATE, ({ hands }) => {
      dispatch({ type: "SET_RAISED_HANDS", payload: hands || {} });
    });

    // The server owns hands and lowers them when a user leaves, so a dropped
    // call alone does not clear one.
    socketRef.current.on(SOCKET_EVENTS.RAISED_HAND_UPDATED, ({ userID, hand }) => {
      if (!userID) return;
      if (hand?.raised) {
        dispatch({ type: "SET_RAISED_HAND", payload: { userID, hand } });
      } else {
        dispatch({ type: "CLEAR_RAISED_HAND", payload: userID });
      }
    });

    socketRef.current.on(SOCKET_EVENTS.USER_DISCONNECTED, ({ userID }) => {
      callsRef.current[userID]?.close();
      delete callsRef.current[userID];
      dispatch({ type: "REMOVE_CONNECTION", payload: userID });
    });

    return () => {
      socketRef.current?.off("connect");
      socketRef.current?.off(SOCKET_EVENTS.USER_JOINED);
      socketRef.current?.off(SOCKET_EVENTS.ROOM_HAND_STATE);
      socketRef.current?.off(SOCKET_EVENTS.RAISED_HAND_UPDATED);
      socketRef.current?.off(SOCKET_EVENTS.USER_DISCONNECTED);
      peerRef.current?.off("call");
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      Object.values(callsRef.current).forEach((call) => call.close());
      callsRef.current = {};
      setSocket(null);
      setPeerID(null);
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
      <SocketContext.Provider
        value={{
          joinRoomFunc,
          leaveRoomFunc,
          peerReady,
          socket,
          syncLocalStream,
          replaceOutgoingTrack,
          setRaisedHand,
          peerID,
        }}
      >
        {children}
      </SocketContext.Provider>
    </ReduxContext.Provider>
  );
};
