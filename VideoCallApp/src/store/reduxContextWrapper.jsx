import { createContext, useRef, useEffect, useReducer } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";

export const ReduxContext = createContext();

export const ReduxContextWrapper = ({ children }) => {
  let { current: socket } = useRef(io("http://localhost:8002/"));
  let { current: peer } = useRef(new Peer());
  const [state, dispatch] = useReducer(reducerFun, initialState);
  const { localStream } = state;

  useEffect(() => {
    //peer = new Peer();
    //socket = ;

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

  function reducerFun(state, action) {
    switch (action.type) {
      case "SET_LOCAL_STREAM":
        return {
          ...state,
          localStream: action.payload,
        };

      case "JOIN_ROOM":
        socket.emit("join_room", { roomID: action.payload, userID: peer.id });
        return {
          ...state,
          roomID: action.payload,
        };

      case "ADD_CONNECTION":
        let call = action.payload;
        return {
          ...state,
          connections: {
            ...state.connections,
            [call.peer]: call,
          },
        };

      case "REMOVE_CONNECTION":
        let peerID = action.payload;
        state.connections[peerID]?.close();
        let updatedConn = { ...state.connections };
        delete updatedConn[peerID];
        return {
          ...state,
          connections: updatedConn,
        };

      case "LEAVE_ROOM":
        socket.emit("user_disconnect", {
          userID: peer.id,
          roomID: state.roomID,
        });
        return {
          ...state,
          roomID: null,
        };
    }
  }

  return (
    <ReduxContext.Provider value={[state, dispatch]}>
      {children}
    </ReduxContext.Provider>
  );
};

const initialState = {
  localStream: null,
  connections: {},
  roomID: null,
};
