const http = require("http");
const express = require("express");
const { Server: SocketIO } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new SocketIO(server, {
  cors: {
    origin: "*",
  },
});
const PORT = process.env.PORT || 8002;

app.use(express.static(path.resolve("./public")));

server.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomID, userID }) => {
    socket.join(roomID);
    socket.to(roomID).emit("user_joined", {
      userID: userID,
    });
  });

  socket.on("user_disconnect", ({ userID, roomID }) => {
    socket.to(roomID).emit("user_disconnected", { userID: userID });
    socket.leave(roomID);
  });
});
