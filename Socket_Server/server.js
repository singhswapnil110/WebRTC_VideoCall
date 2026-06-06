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
    socket.data.userID = userID;
    socket.to(roomID).emit("user_joined", { userID });
  });

  socket.on("user_disconnect", ({ userID, roomID }) => {
    socket.to(roomID).emit("user_disconnected", { userID });
    socket.leave(roomID);
  });

  socket.on("check_room", ({ roomID }, callback) => {
    const room = io.sockets.adapter.rooms.get(roomID);
    const count = room ? room.size : 0;
    callback({ count });
  });

  socket.on("send_message", ({ roomID, message }) => {
    socket.to(roomID).emit("receive_message", message);
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit("user_disconnected", { userID: socket.data.userID });
      }
    }
  });
});
