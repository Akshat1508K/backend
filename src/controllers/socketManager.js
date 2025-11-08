import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};
let usernames = {}; // socket.id -> username
let videoStatus = {}; // socket.id -> true/false

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("USER CONNECTED:", socket.id);

        // ✅ User joins with username
        socket.on("join-call", (path, username = "User") => {
            if (!connections[path]) connections[path] = [];
            connections[path].push(socket.id);

            usernames[socket.id] = username;
            videoStatus[socket.id] = true; // default ON
            timeOnline[socket.id] = new Date();

            // Notify everyone in room
            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit(
                    "user-joined",
                    socket.id,
                    connections[path],
                    usernames,
                    videoStatus
                );
            }



            // Send old messages
            if (messages[path]) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]);
                }
            }
        });


        // ✅ WebRTC signal passthrough
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // ✅ Chat message
        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );



            if (!found) return;

            if (!messages[matchingRoom]) messages[matchingRoom] = [];

            const payload = {
                data,
                sender,
                socketIdSender: socket.id,
            };


            
            messages[matchingRoom].push(payload);

            connections[matchingRoom].forEach((elem) => {
                io.to(elem).emit("chat-message", payload);
            });
        });

        // ✅ Video toggle
        socket.on("toggle-video", (isEnabled) => {
            videoStatus[socket.id] = isEnabled;
            for (const [room, ids] of Object.entries(connections)) {
                if (ids.includes(socket.id)) {
                    ids.forEach((peer) => {
                        io.to(peer).emit("video-toggled", socket.id, isEnabled);
                    });
                }
            }
        });

        // ✅ Disconnect handling
        socket.on("disconnect", () => {
            let key;
            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k;
                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id);
                        }

                        const index = connections[key].indexOf(socket.id);
                        connections[key].splice(index, 1);
                        delete usernames[socket.id];
                        delete videoStatus[socket.id];

                        if (connections[key].length === 0) {
                            delete connections[key];
                            delete messages[key];
                        }
                    }
                }
            }

            delete timeOnline[socket.id];
        });
    });

    return io;
};
