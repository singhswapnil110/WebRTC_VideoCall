import { createContext, useRef, useEffect, useReducer, useState, useCallback } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import { reducerFun } from "./reducer";

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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const { localStream, roomID, name } = state;

  const syncLocalStream = useCallback((stream) => {
    localStreamRef.current = stream;
    dispatch({ type: "SET_LOCAL_STREAM", payload: stream });
  }, []);

  const replaceOutgoingTrack = useCallback(async (kind, nextTrack) => {
    const swaps = Object.values(callsRef.current).map(async (call) => {
      const sender = call.peerConnection
        ?.getSenders?.()
        ?.find((entry) => entry.track?.kind === kind || (!entry.track && kind === "video"));
      if (sender) {
        await sender.replaceTrack(nextTrack || null);
      }
    });
    await Promise.all(swaps);
  }, []);

  const setRaisedHand = useCallback((raised) => {
    const currentRoomID = roomIDRef.current;
    const userID = peerRef.current?.id;
    if (!socketRef.current || !currentRoomID || !userID) return;
    socketRef.current.emit("set_raised_hand", {
      roomID: currentRoomID,
      userID,
      userName: nameRef.current || "You",
      raised,
      timestamp: Date.now(),
    });
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

  useEffect(() => {
    const localVideoTrack = localStream?.getVideoTracks?.()[0] || null;
    setIsScreenSharing(Boolean(localVideoTrack && localVideoTrack.getSettings?.().displaySurface));
  }, [localStream]);

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

    socketRef.current.on("user_joined", ({ userID, userName }) => {
      if (!localStreamRef.current || !peerRef.current) return;
      const call = peerRef.current.call(userID, localStreamRef.current, {
        metadata: { userName: nameRef.current || "You" },
      });
      if (!call) return;
      callsRef.current[call.peer] = call;
      call.on("stream", (stream) =>
        dispatch({ type: "ADD_CONNECTION", payload: { peer: call.peer, stream, name: userName || call.metadata?.userName } })
      );
      call.on("close", () => {
        dispatch({ type: "REMOVE_CONNECTION", payload: call.peer });
        dispatch({ type: "CLEAR_RAISED_HAND", payload: call.peer });
      });
    });

    peerRef.current.on("call", (call) => {
      if (!localStreamRef.current) return;
      call.answer(localStreamRef.current);
      callsRef.current[call.peer] = call;
      call.on("stream", (stream) =>
        dispatch({ type: "ADD_CONNECTION", payload: { peer: call.peer, stream, name: call.metadata?.userName } })
      );
      call.on("close", () => {
        dispatch({ type: "REMOVE_CONNECTION", payload: call.peer });
        dispatch({ type: "CLEAR_RAISED_HAND", payload: call.peer });
      });
    });

    socketRef.current.on("room_hand_state", ({ hands }) => {
      dispatch({ type: "SET_RAISED_HANDS", payload: hands || {} });
    });

    socketRef.current.on("raised_hand_updated", ({ userID, hand }) => {
      if (!userID) return;
      if (hand?.raised) {
        dispatch({ type: "SET_RAISED_HAND", payload: { userID, hand } });
        return;
      }
      dispatch({ type: "CLEAR_RAISED_HAND", payload: userID });
    });

    socketRef.current.on("user_disconnected", ({ userID }) => {
      callsRef.current[userID]?.close();
      delete callsRef.current[userID];
      dispatch({ type: "REMOVE_CONNECTION", payload: userID });
      dispatch({ type: "CLEAR_RAISED_HAND", payload: userID });
    });

    return () => {
      socketRef.current?.off("user_joined");
      socketRef.current?.off("room_hand_state");
      socketRef.current?.off("raised_hand_updated");
      socketRef.current?.off("user_disconnected");
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
    socketRef.current.emit("join_room", {
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
      socketRef.current.emit("user_disconnect", {
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
          isScreenSharing,
          peerID,
        }}
      >
        {children}
      </SocketContext.Provider>
    </ReduxContext.Provider>
  );
};
