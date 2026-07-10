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
      const { peer, stream, name } = action.payload;
      return {
        ...state,
        connections: {
          ...state.connections,
          [peer]: {
            peer,
            remoteStream: stream,
            name: name || state.connections[peer]?.name || "",
          },
        },
      };
    }

    case "REMOVE_CONNECTION": {
      const peerID = action.payload;
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
        messages: [],
      };

    case "SET_NAME":
      return {
        ...state,
        name: action.payload,
      };

    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    default:
      return state;
  }
}
