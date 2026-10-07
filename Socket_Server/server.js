const http = require("http");
const express = require("express");
const { Server: SocketIO } = require("socket.io");
const path = require("path");
const { SOCKET_EVENTS, CAPTION_LIMITS } = require("./socketEvents");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.error("ALLOWED_ORIGINS must list the app origins allowed to connect, e.g. http://localhost:5173");
  process.exit(1);
}

const io = new SocketIO(server, {
  cors: { origin: allowedOrigins },
  // CORS headers only stop browsers reading polling responses; WebSocket
  // upgrades ignore them, so the origin is checked on every handshake.
  // Non-browser clients send no Origin and are not what this guards against.
  allowRequest: (req, callback) => {
    const { origin } = req.headers;
    callback(null, !origin || allowedOrigins.includes(origin));
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
    // Senders render their own captions locally.
    socket.to(roomID).emit(SOCKET_EVENTS.RECEIVE_CAPTION, {
      captionId: caption.captionId,
      text: caption.text,
      isFinal: caption.isFinal,
      senderId: socket.id,
      senderName: socket.data.userName || "",
    });
  });

  socket.on("disconnecting", () => {
    const { userID } = socket.data;
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      // The server can notice a dropped connection only after the client has
      // already reconnected and rejoined; announcing that stale socket would
      // tear down the call that was just restored.
      if (isUserInRoomOnAnotherSocket(room, userID, socket.id)) continue;
      socket.to(room).emit(SOCKET_EVENTS.USER_DISCONNECTED, { userID });
    }
  });
});
