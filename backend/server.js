import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

const usersPerRoom = {}; // Track users per room

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinRoom', ({ userName, accessCode }) => {
        console.log(`${userName} is joining room ${accessCode}`);

        socket.join(accessCode);
        socket.data.userName = userName;
        socket.data.room = accessCode;

        if (!usersPerRoom[accessCode]) {
            usersPerRoom[accessCode] = [];
        }

        if (!usersPerRoom[accessCode].includes(userName)) {
            usersPerRoom[accessCode].push(userName);
        }

        socket.to(accessCode).emit('roomNotice', userName);

        // Emit updated user list
        io.to(accessCode).emit('roomUsers', usersPerRoom[accessCode]);
    });

    // Chat messages
    socket.on('chatMessage', (msg) => {
        const room = socket.data.room;
        if (room) {
            socket.to(room).emit('chatMessage', msg);
        }
    });

    // Typing indicators
    socket.on('typing', (userName) => {
        const room = socket.data.room;
        if (room) {
            socket.to(room).emit('typing', userName);
        }
    });

    socket.on('stopTyping', (userName) => {
        const room = socket.data.room;
        if (room) {
            socket.to(room).emit('stopTyping', userName);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const room = socket.data.room;
        const userName = socket.data.userName;

        if (room && usersPerRoom[room]) {
            // Remove user from room
            usersPerRoom[room] = usersPerRoom[room].filter((u) => u !== userName);

            // Emit updated list
            io.to(room).emit('roomUsers', usersPerRoom[room]);
        }

        console.log('User disconnected:', socket.id);
    });
});

app.get('/', (req, res) => {
    res.send('<h1>Socket.IO Chat Server</h1>');
});

server.listen(4600, () => {
    console.log('Server running at http://localhost:4600');
});
