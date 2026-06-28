const http = require("http");
const express = require("express");
const { Server: SocketIO } = require("socket.io");
const path = require("path");

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
const MAX_CAPTION_TEXT_LENGTH = 500;

app.use(express.static(path.resolve("./public")));

server.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));

const isValidRoomID = (roomID) => typeof roomID === "string" && roomID.length > 0 && roomID.length <= 64;

const isValidCaption = (caption) => {
  if (!caption || typeof caption !== "object") return false;
  if (typeof caption.captionId !== "string" || caption.captionId.length === 0 || caption.captionId.length > 120) return false;
  if (typeof caption.senderId !== "string" || caption.senderId.length === 0 || caption.senderId.length > 120) return false;
  if (typeof caption.senderName !== "string" || caption.senderName.trim().length === 0 || caption.senderName.length > 80) return false;
  if (typeof caption.text !== "string" || caption.text.trim().length === 0 || caption.text.length > MAX_CAPTION_TEXT_LENGTH) return false;
  if (typeof caption.isFinal !== "boolean") return false;
  if (!Number.isInteger(caption.seq) || caption.seq < 1) return false;
  if (!Number.isFinite(caption.timestamp)) return false;
  if (
    caption.detectedLanguage !== undefined &&
    (typeof caption.detectedLanguage !== "string" || caption.detectedLanguage.length > 24)
  ) {
    return false;
  }
  return true;
};

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomID, userID }) => {
    if (!isValidRoomID(roomID) || typeof userID !== "string" || userID.length === 0) return;
    socket.join(roomID);
    socket.data.userID = userID;
    socket.to(roomID).emit("user_joined", { userID });
  });

  socket.on("user_disconnect", ({ roomID }) => {
    if (!isValidRoomID(roomID)) return;
    socket.to(roomID).emit("user_disconnected", { userID: socket.data.userID });
    socket.leave(roomID);
  });

  socket.on("check_room", ({ roomID }, callback) => {
    if (typeof callback !== "function") return;
    if (!isValidRoomID(roomID)) {
      callback({ count: 0 });
      return;
    }
    const room = io.sockets.adapter.rooms.get(roomID);
    const count = room ? room.size : 0;
    callback({ count });
  });

  socket.on("send_message", ({ roomID, message }) => {
    if (!isValidRoomID(roomID) || !socket.rooms.has(roomID)) return;
    if (!message || typeof message.text !== "string" || message.text.length === 0 || message.text.length > MAX_MESSAGE_LENGTH) return;
    io.to(roomID).emit("receive_message", message);
  });

  socket.on("send_caption", ({ roomID, caption }) => {
    if (!isValidRoomID(roomID) || !socket.rooms.has(roomID)) return;
    if (!isValidCaption(caption)) return;
    io.to(roomID).emit("receive_caption", caption);
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit("user_disconnected", { userID: socket.data.userID });
      }
    }
  });
});
