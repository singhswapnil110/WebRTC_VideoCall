const http = require("http");
const express = require("express");
const { Server: SocketIO } = require("socket.io");
const path = require("path");
const { SOCKET_EVENTS, CAPTION_LIMITS } = require("./socketEvents");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:5175")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const io = new SocketIO(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
const PORT = process.env.PORT || 8002;
const MAX_MESSAGE_LENGTH = 4000;

app.use(express.static(path.resolve("./public")));

server.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));

const isValidRoomID = (roomID) => typeof roomID === "string" && roomID.length > 0 && roomID.length <= 64;

const isUserInRoomOnAnotherSocket = (roomID, userID, socketID) => {
  const members = io.sockets.adapter.rooms.get(roomID);
  if (!members || !userID) return false;
  for (const memberID of members) {
    if (memberID !== socketID && io.sockets.sockets.get(memberID)?.data.userID === userID) return true;
  }
  return false;
};

// Raised hands per room, keyed by user id. In memory only, like the rooms themselves.
const roomHands = new Map();

const lowerHand = (roomID, userID) => {
  const hands = roomHands.get(roomID);
  if (!hands?.[userID]) return;
  delete hands[userID];
  if (Object.keys(hands).length === 0) roomHands.delete(roomID);
  io.to(roomID).emit(SOCKET_EVENTS.RAISED_HAND_UPDATED, { userID, hand: null });
};

// Identity is stamped from the socket on relay, so only content is validated.
const isValidCaptionContent = (caption) => {
  if (!caption || typeof caption !== "object") return false;
  if (
    typeof caption.captionId !== "string" ||
    caption.captionId.length === 0 ||
    caption.captionId.length > CAPTION_LIMITS.MAX_ID_LENGTH
  ) {
    return false;
  }
  if (
    typeof caption.text !== "string" ||
    caption.text.trim().length === 0 ||
    caption.text.length > CAPTION_LIMITS.MAX_TEXT_LENGTH
  ) {
    return false;
  }
  return typeof caption.isFinal === "boolean";
};

io.on("connection", (socket) => {
  socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ roomID, userID, userName }) => {
    if (!isValidRoomID(roomID) || typeof userID !== "string" || userID.length === 0) return;
    const normalizedUserName = typeof userName === "string" ? userName.trim().slice(0, CAPTION_LIMITS.MAX_NAME_LENGTH) : "";
    socket.join(roomID);
    socket.data.userID = userID;
    socket.data.userName = normalizedUserName;
    socket.to(roomID).emit(SOCKET_EVENTS.USER_JOINED, { userID, userName: normalizedUserName });
    socket.emit(SOCKET_EVENTS.ROOM_HAND_STATE, { hands: roomHands.get(roomID) || {} });
  });

  socket.on(SOCKET_EVENTS.USER_DISCONNECT, ({ roomID }) => {
    if (!isValidRoomID(roomID)) return;
    lowerHand(roomID, socket.data.userID);
    socket.to(roomID).emit(SOCKET_EVENTS.USER_DISCONNECTED, { userID: socket.data.userID });
    socket.leave(roomID);
  });

  socket.on(SOCKET_EVENTS.CHECK_ROOM, ({ roomID }, callback) => {
    if (typeof callback !== "function") return;
    if (!isValidRoomID(roomID)) {
      callback({ count: 0 });
      return;
    }
    const room = io.sockets.adapter.rooms.get(roomID);
    const count = room ? room.size : 0;
    callback({ count });
  });

  socket.on(SOCKET_EVENTS.SEND_MESSAGE, ({ roomID, message }) => {
    if (!isValidRoomID(roomID) || !socket.rooms.has(roomID)) return;
    if (!message || typeof message.text !== "string" || message.text.length === 0 || message.text.length > MAX_MESSAGE_LENGTH) return;
    io.to(roomID).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, message);
  });

  socket.on(SOCKET_EVENTS.SEND_CAPTION, ({ roomID, caption }) => {
    if (!isValidRoomID(roomID) || !socket.rooms.has(roomID)) return;
    if (!isValidCaptionContent(caption)) return;
    // Senders render their own captions locally.
    socket.to(roomID).emit(SOCKET_EVENTS.RECEIVE_CAPTION, {
      captionId: caption.captionId,
      text: caption.text,
      isFinal: caption.isFinal,
      senderId: socket.id,
      senderName: socket.data.userName || "",
    });
  });

  socket.on(SOCKET_EVENTS.SET_RAISED_HAND, ({ roomID, raised } = {}) => {
    const { userID, userName } = socket.data;
    if (!isValidRoomID(roomID) || !socket.rooms.has(roomID) || !userID || typeof raised !== "boolean") return;
    if (!raised) {
      lowerHand(roomID, userID);
      return;
    }
    // Identity comes from the socket, as for captions.
    const hand = { userID, userName: userName || "", raised: true, timestamp: Date.now() };
    if (!roomHands.has(roomID)) roomHands.set(roomID, {});
    roomHands.get(roomID)[userID] = hand;
    io.to(roomID).emit(SOCKET_EVENTS.RAISED_HAND_UPDATED, { userID, hand });
  });

  socket.on("disconnecting", () => {
    const { userID } = socket.data;
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      // The server can notice a dropped connection only after the client has
      // already reconnected and rejoined; announcing that stale socket would
      // tear down the call that was just restored.
      if (isUserInRoomOnAnotherSocket(room, userID, socket.id)) continue;
      lowerHand(room, userID);
      socket.to(room).emit(SOCKET_EVENTS.USER_DISCONNECTED, { userID });
    }
  });
});
