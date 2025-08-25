// socket.service.js
const Message = require("../models/message.model");
const Conversation = require("../models/conversation.model");

let users = {};
const ADMIN_ID = "685e2fea79bd687050637953";

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // Join socket
    socket.on("join", (userId) => {
      users[userId] = socket.id;
      console.log("📌", userId, "joined with socket", socket.id);
    });

    // Khi có tin nhắn
    socket.on("sendMessage", async ({ senderId, receiverId, message, imageUrl }) => {
      try {
        // 1. Lưu vào DB
        const newMessage = await Message.create({
          senderId,
          receiverId,
          message,
          imageUrl: imageUrl || null,
          timestamp: new Date()
        });

        // 2. Update Conversation
        const userId = senderId === ADMIN_ID ? receiverId : senderId;
        let convo = await Conversation.findOne({ user: userId, admin: ADMIN_ID });
        if (!convo) {
          convo = new Conversation({
            user: userId,
            admin: ADMIN_ID,
            lastMessage: message,
            updatedAt: new Date()
          });
        } else {
          convo.lastMessage = message;
          convo.updatedAt = new Date();
        }
        await convo.save();

        // 3. Emit realtime cho receiver (nếu đang online)
        const receiverSocket = users[receiverId];
        if (receiverSocket) {
          io.to(receiverSocket).emit("receiveMessage", newMessage);
        }

        // 4. Emit lại cho sender để update UI
        const senderSocket = users[senderId];
        if (senderSocket) {
          io.to(senderSocket).emit("receiveMessage", newMessage);
        }
      } catch (err) {
        console.error("❌ Error saving message:", err.message);
      }
    });

    // Khi user disconnect
    socket.on("disconnect", () => {
      for (let userId in users) {
        if (users[userId] === socket.id) {
          delete users[userId];
          console.log("❌ User disconnected:", userId);
          break;
        }
      }
    });
  });
}

module.exports = socketHandler;
