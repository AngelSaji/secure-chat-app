const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Serve static files
app.use(express.static("public"));
app.use(cors());

const algorithm = "aes-256-ctr";
const secretKey = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encrypt(text) {
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString("hex"),
        content: encrypted.toString("hex")
    };
}

function decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(encryptedData.iv, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedData.content, "hex")), decipher.final()]);
    return decrypted.toString();
}

io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("chat message", (msg) => {
        const encryptedMsg = encrypt(msg);
        io.emit("chat message", encryptedMsg);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });

    // WebRTC Signaling for Video/Audio Calls
    socket.on("offer", (data) => {
        socket.broadcast.emit("offer", data);
    });

    socket.on("answer", (data) => {
        socket.broadcast.emit("answer", data);
    });

    socket.on("ice-candidate", (data) => {
        socket.broadcast.emit("ice-candidate", data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
