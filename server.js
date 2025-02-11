// server.js (Backend - Node.js & Express)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

const Message = mongoose.model("Message", new mongoose.Schema({ sender: String, content: String, iv: String }));

// Serve static files (frontend)
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

    // Send previous messages
    Message.find().then(messages => {
        socket.emit("previous messages", messages.map(msg => ({ sender: msg.sender, content: decrypt(msg) })));
    });
    
    socket.on("chat message", async ({ sender, msg }) => {
        const encryptedMsg = encrypt(msg);
        await Message.create({ sender, content: encryptedMsg.content, iv: encryptedMsg.iv });
        io.emit("chat message", { sender, content: msg });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });

    // WebRTC Signaling
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

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
