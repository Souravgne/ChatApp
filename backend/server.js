// server.js
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

/**
 * IMPORTANT:
 * - maxHttpBufferSize increased to allow reasonably large base64 payloads (adjust as needed).
 * - cors: allow your frontend origin in production instead of "*".
 */
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB (adjust to your needs)
});

const usersPerRoom = {}; // { roomId: [userName] }
const socketsMeta = {}; // { socketId: { userName, room } }

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", ({ userName, accessCode }) => {
    if (!userName || !accessCode) return;

    console.log(
      `${userName} is joining room ${accessCode} (socket: ${socket.id})`
    );

    socket.join(accessCode);
    socket.data.userName = userName;
    socket.data.room = accessCode;

    socketsMeta[socket.id] = { userName, room: accessCode };

    if (!usersPerRoom[accessCode]) usersPerRoom[accessCode] = [];

    if (!usersPerRoom[accessCode].includes(userName)) {
      usersPerRoom[accessCode].push(userName);
    }

    // Notify others in room that someone joined
    socket.to(accessCode).emit("roomNotice", userName);

    // Emit updated user list to everyone in the room
    io.to(accessCode).emit("roomUsers", usersPerRoom[accessCode]);
  });

  socket.on("chatMessage", (msg) => {
    const room = socket.data.room;
    if (room) {
      // emit to everyone else in the room
      socket.to(room).emit("chatMessage", msg);
    }
  });

  socket.on("typing", (userName) => {
    const room = socket.data.room;
    if (room) socket.to(room).emit("typing", userName);
  });

  socket.on("stopTyping", (userName) => {
    const room = socket.data.room;
    if (room) socket.to(room).emit("stopTyping", userName);
  });

  socket.on("disconnect", (reason) => {
    const meta = socketsMeta[socket.id];
    if (meta && meta.room && usersPerRoom[meta.room]) {
      usersPerRoom[meta.room] = usersPerRoom[meta.room].filter(
        (u) => u !== meta.userName
      );
      io.to(meta.room).emit("roomUsers", usersPerRoom[meta.room]);
    }

    delete socketsMeta[socket.id];
    console.log(`User disconnected: ${socket.id} (${reason})`);
  });
});

app.get("/", (req, res) => {
  res.send("<h1>Socket.IO Chat Server</h1>");
});

const PORT = process.env.PORT || 4600;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
