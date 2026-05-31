export function reducerFun(state, action) {
  switch (action.type) {
    case "SET_LOCAL_STREAM":
      return {
        ...state,
        localStream: action.payload,
      };

    case "SET_ROOM":
      return {
        ...state,
        roomID: action.payload,
      };

    case "ADD_CONNECTION": {
      const call = action.payload;
      return {
        ...state,
        connections: {
          ...state.connections,
          [call.peer]: call,
        },
      };
    }

    case "REMOVE_CONNECTION": {
      const peerID = action.payload;
      state.connections[peerID]?.close();
      const updatedConn = { ...state.connections };
      delete updatedConn[peerID];
      return {
        ...state,
        connections: updatedConn,
      };
    }

    case "LEAVE_ROOM":
      return {
        ...state,
        roomID: null,
        connections: {},
      };

    default:
      return state;
  }
}
