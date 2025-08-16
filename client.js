const { io } = require("socket.io-client");

const socket = io("http://localhost:4000");

const myUserId = "687cb086acc97efcdab58606"; // Replace with your user ID
const friendId = "687ccc83a8a897c6e32a76bf"; // Replace with friend's user ID

socket.emit("join", myUserId);

socket.on("receiverMessage", (msg) => {
    console.log("📨 Received:", msg);
});

setTimeout(() => {
    socket.emit("sendMessage", {
        senderId: myUserId,
        receiverId: friendId,
        content: "Hello from Node client"
    });
}, 2000);
