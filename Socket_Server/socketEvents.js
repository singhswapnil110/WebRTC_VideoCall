const SOCKET_EVENTS = Object.freeze({
  JOIN_ROOM: "join_room",
  USER_JOINED: "user_joined",
  USER_DISCONNECT: "user_disconnect",
  USER_DISCONNECTED: "user_disconnected",
  CHECK_ROOM: "check_room",
  SEND_MESSAGE: "send_message",
  RECEIVE_MESSAGE: "receive_message",
  SEND_CAPTION: "send_caption",
  RECEIVE_CAPTION: "receive_caption",
  SET_RAISED_HAND: "set_raised_hand",
  RAISED_HAND_UPDATED: "raised_hand_updated",
  ROOM_HAND_STATE: "room_hand_state",
});

// Mirrored in VideoCallApp/src/redux/socketEvents.js.
const CAPTION_LIMITS = Object.freeze({
  MAX_TEXT_LENGTH: 500,
  MAX_NAME_LENGTH: 64,
  MAX_ID_LENGTH: 120,
});

module.exports = { SOCKET_EVENTS, CAPTION_LIMITS };
