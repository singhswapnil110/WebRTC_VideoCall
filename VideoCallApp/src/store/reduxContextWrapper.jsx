import {
  createContext,
  useRef,
  useEffect,
  useReducer,
  useCallback,
  useLayoutEffect,
} from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import { reducerFun } from "./reducer";

export const ReduxContext = createContext();
export const SocketContext = createContext();

export const ReduxContextWrapper = ({ children }) => {
  let { current: socket } = useRef();
  let { current: peer } = useRef(null);
  const [state, dispatch] = useReducer(reducerFun, initialState);
  const { localStream } = state;

  useEffect(() => {
    peer = new Peer();
    socket = io("http://localhost:8002/");

    socket.on("user_joined", ({ userID }) => {
      const call = peer.call(userID, localStream);
      call.on("stream", () =>
        dispatch({ type: "ADD_CONNECTION", payload: call })
      );
    });

    peer.on("call", (call) => {
      call.answer(localStream);
      call.on("stream", () =>
        dispatch({ type: "ADD_CONNECTION", payload: call })
      );
    });

    socket.on("user_disconnected", ({ userID }) => {
      dispatch({ type: "REMOVE_CONNECTION", payload: userID });
    });

    return () => {
      socket.off("user_joined");
      socket.off("user_disconnected");
      peer.off("call");
    };
  }, [localStream]);

  const joinRoomFunc = (roomID) => {
    socket.emit("join_room", { roomID: roomID, userID: peer.id });
    dispatch({ type: "SET_ROOM", payload: roomID });
  };

  const leaveRoomFunc = () => {
    socket.emit("user_disconnect", {
      userID: peer.id,
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

const initialState = {
  localStream: null,
  connections: {},
  roomID: null,
  name: "",
  messages: [],
};
