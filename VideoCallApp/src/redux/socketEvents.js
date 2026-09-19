export const SOCKET_EVENTS = Object.freeze({
  JOIN_ROOM: "join_room",
  USER_JOINED: "user_joined",
  USER_DISCONNECT: "user_disconnect",
  USER_DISCONNECTED: "user_disconnected",
  CHECK_ROOM: "check_room",
  SEND_MESSAGE: "send_message",
  RECEIVE_MESSAGE: "receive_message",
  SEND_CAPTION: "send_caption",
  RECEIVE_CAPTION: "receive_caption",
});

// Wire limits for caption packets. Mirrored in Socket_Server/socketEvents.js —
// the client clamps to these, the server rejects anything beyond them.
export const CAPTION_LIMITS = Object.freeze({
  MAX_TEXT_LENGTH: 500,
  MAX_NAME_LENGTH: 80,
  MAX_ID_LENGTH: 120,
});
