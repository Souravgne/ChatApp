// server.js
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";

const app = express();

/**
 * ✅ NEW: Health check endpoint
 * Docker healthcheck calls: http://127.0.0.1:4600/health
 * Must return HTTP 200
 */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const server = createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 600000, // 10 minutes
  pingInterval: 60000, // Send a ping every 1 minute
  maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB
});

const usersPerRoom = {};
const socketsMeta = {};

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

    socket.to(accessCode).emit("roomNotice", userName);
    io.to(accessCode).emit("roomUsers", usersPerRoom[accessCode]);
  });

  socket.on("chatMessage", (msg) => {
    const room = socket.data.room;
    if (room) {
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

const PORT = process.env.PORT || 4600;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
