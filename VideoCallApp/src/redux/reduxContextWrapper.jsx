import { createContext, useRef, useEffect, useReducer } from "react";
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
};

export const ReduxContextWrapper = ({ children }) => {
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const [state, dispatch] = useReducer(reducerFun, initialState);
  const { localStream } = state;

  // Keep localStreamRef in sync so event handlers always have the latest stream
  // without needing to re-create the socket/peer connection on every stream change
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Initialize socket and peer once on mount
  useEffect(() => {
    peerRef.current = new Peer();
    socketRef.current = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:8002"
    );

    socketRef.current.on("user_joined", ({ userID }) => {
      const call = peerRef.current.call(userID, localStreamRef.current);
      call.on("stream", () =>
        dispatch({ type: "ADD_CONNECTION", payload: call })
      );
    });

    peerRef.current.on("call", (call) => {
      call.answer(localStreamRef.current);
      call.on("stream", () =>
        dispatch({ type: "ADD_CONNECTION", payload: call })
      );
    });

    socketRef.current.on("user_disconnected", ({ userID }) => {
      dispatch({ type: "REMOVE_CONNECTION", payload: userID });
    });

    return () => {
      socketRef.current?.off("user_joined");
      socketRef.current?.off("user_disconnected");
      peerRef.current?.off("call");
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
    };
  }, []);

  const joinRoomFunc = (roomID) => {
    socketRef.current.emit("join_room", {
      roomID,
      userID: peerRef.current.id,
    });
    dispatch({ type: "SET_ROOM", payload: roomID });
  };

  const leaveRoomFunc = () => {
    socketRef.current.emit("user_disconnect", {
      userID: peerRef.current.id,
      roomID: state.roomID,
    });
    dispatch({ type: "LEAVE_ROOM" });
  };

  return (
    <ReduxContext.Provider value={[state, dispatch]}>
      <SocketContext.Provider value={{ joinRoomFunc, leaveRoomFunc }}>
        {children}
      </SocketContext.Provider>
    </ReduxContext.Provider>
  );
};
