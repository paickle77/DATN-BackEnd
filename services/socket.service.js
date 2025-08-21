// services/socket.service.js
const Message = require("../models/message.model");
const Conversation = require("../models/conversation.model");

const ADMIN_ID = "685e2fea79bd687050637953";
const toStr = (v) => (typeof v === "string" ? v : String(v || ""));

function socketHandler(io) {
  console.log("🧩 socketHandler LOADED from", __filename);

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    // Mỗi client join đúng userId của họ
    socket.on("join", (userId) => {
      const uid = toStr(userId);
      if (!uid) return;
      socket.join(uid);
      console.log("📌 JOIN ROOM:", uid, "socket:", socket.id);
    });

    // Gửi tin nhắn
    socket.on("sendMessage", async (data, ack) => {
      try {
        const senderId   = toStr(data?.senderId);
        const receiverId = toStr(data?.receiverId);
        const message    = data?.message ?? "";
        const imageUrl   = data?.imageUrl ?? null;

        if (!senderId || !receiverId || (!message && !imageUrl)) {
          const errMsg = "Thiếu dữ liệu gửi tin.";
          console.warn("⚠️", errMsg, { senderId, receiverId });
          if (typeof ack === "function") ack({ ok: false, error: errMsg });
          return;
        }

        // Lưu tin
        const saved = await Message.create({
          senderId, receiverId, message, imageUrl, timestamp: new Date(),
        });

        // Cập nhật hội thoại (user - admin)
        const lastContent = message === "" ? "Đã gửi hình ảnh" : message;
        const userIdForConvo = senderId === ADMIN_ID ? receiverId : senderId;
        await Conversation.findOneAndUpdate(
          { user: userIdForConvo, admin: ADMIN_ID },
          { $set: { lastMessage: lastContent, updatedAt: new Date() } },
          { upsert: true, new: true }
        );

        const payload = {
          _id: String(saved._id),
          senderId,
          receiverId,
          message: saved.message,
          imageUrl: saved.imageUrl,
          timestamp: saved.timestamp,
        };

        // Emit CHÍNH XÁC theo phòng (KHÔNG broadcast toàn cục)
        io.to(senderId).emit("receiveMessage", payload);       // để người gửi thấy ngay
        if (receiverId !== senderId) {
          io.to(receiverId).emit("receiveMessage", payload);   // người nhận
        }

        // Debug phòng
        const rooms = io.of("/").adapter.rooms;
        console.log("🟢 EMIT ->", {
          senderId, receiverId,
          hasSenderRoom: rooms.has(senderId),
          hasReceiverRoom: rooms.has(receiverId),
        });

        // ACK về FE để hiển thị tức thì
        if (typeof ack === "function") ack({ ok: true, message: payload });
      } catch (err) {
        console.error("❌ Error saving message:", err);
        if (typeof ack === "function") ack({ ok: false, error: err.message });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });
}

module.exports = socketHandler;
