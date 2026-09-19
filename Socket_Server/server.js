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
const MAX_CAPTION_TEXT_LENGTH = CAPTION_LIMITS.MAX_TEXT_LENGTH;

app.use(express.static(path.resolve("./public")));

server.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));

const isValidRoomID = (roomID) => typeof roomID === "string" && roomID.length > 0 && roomID.length <= 64;

// Only the content fields are client-controlled. Identity is stamped from the
// socket when relaying, so a participant cannot publish captions as someone
// else or poison another sender's sequence counter.
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
    caption.text.length > MAX_CAPTION_TEXT_LENGTH
  ) {
    return false;
  }
  if (typeof caption.isFinal !== "boolean") return false;
  if (!Number.isInteger(caption.seq) || caption.seq < 1) return false;
  return true;
};

io.on("connection", (socket) => {
  socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ roomID, userID, userName }) => {
    if (!isValidRoomID(roomID) || typeof userID !== "string" || userID.length === 0) return;
    const normalizedUserName = typeof userName === "string" ? userName.trim().slice(0, 64) : "";
    socket.join(roomID);
    socket.data.userID = userID;
    socket.data.userName = normalizedUserName;
    socket.to(roomID).emit(SOCKET_EVENTS.USER_JOINED, { userID, userName: normalizedUserName });
  });

  socket.on(SOCKET_EVENTS.USER_DISCONNECT, ({ roomID }) => {
    if (!isValidRoomID(roomID)) return;
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
    // Senders apply their own captions locally, so relay to everyone else only.
    socket.to(roomID).emit(SOCKET_EVENTS.RECEIVE_CAPTION, {
      captionId: caption.captionId,
      text: caption.text,
      isFinal: caption.isFinal,
      seq: caption.seq,
      senderId: socket.id,
      senderName: socket.data.userName || "",
    });
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit(SOCKET_EVENTS.USER_DISCONNECTED, { userID: socket.data.userID });
      }
    }
  });
});
