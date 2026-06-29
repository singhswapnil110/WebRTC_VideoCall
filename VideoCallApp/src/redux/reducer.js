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
      const existingConnection = state.connections[peer] || {};
      return {
        ...state,
        connections: {
          ...state.connections,
          [peer]: {
            ...existingConnection,
            peer,
            remoteStream: stream,
            name: name ?? existingConnection.name ?? null,
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

    case "SET_RAISED_HANDS":
      return {
        ...state,
        raisedHands: action.payload,
      };

    case "SET_RAISED_HAND": {
      const { userID, hand } = action.payload;
      return {
        ...state,
        raisedHands: {
          ...state.raisedHands,
          [userID]: hand,
        },
      };
    }

    case "CLEAR_RAISED_HAND": {
      const userID = action.payload;
      const raisedHands = { ...state.raisedHands };
      delete raisedHands[userID];
      return {
        ...state,
        raisedHands,
      };
    }

    case "LEAVE_ROOM":
      return {
        ...state,
        roomID: null,
        connections: {},
        messages: [],
        raisedHands: {},
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
