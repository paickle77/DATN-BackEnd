const Message = require("../models/message.model");
const Conversation = require("../models/conversation.model");
const mongoose = require("../models/db"); // ✅ thêm ngay dưới các require model

const ADMIN_ID = "685e2fea79bd687050637953"; // ID admin cố định

// Gửi tin nhắn (user → admin hoặc admin → user)
exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message, imageUrl } = req.body;

    // Lưu message
    const newMessage = await Message.create({
      senderId,
      receiverId,
      message,
      imageUrl: imageUrl || null,
      timestamp: new Date()
    });

    // Xác định user là ai (người khác admin)
    const userId = senderId === ADMIN_ID ? receiverId : senderId;

    let lastMessageContent;
    if(message== '') {
      lastMessageContent = "Đã gửi ảnh";
    } else {
      lastMessageContent = message;
    }
    // Update hoặc tạo conversation
    let convo = await Conversation.findOne({ user: userId, admin: ADMIN_ID });
    if (!convo) {
      convo = new Conversation({
        user: userId,
        admin: ADMIN_ID,
        lastMessage: lastMessageContent,        // ✅ dùng biến đã chuẩn hoá
        updatedAt: new Date()
      });
    } else {
      convo.lastMessage = lastMessageContent;    // ✅ dùng biến đã chuẩn hoá
      convo.updatedAt = new Date();
    }
    await convo.save();

    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const ADMIN_ID = "685e2fea79bd687050637953";

    let convos = await Conversation.find({ admin: ADMIN_ID })
      .populate("user", "email")
      .sort({ updatedAt: -1 });

    // Nếu bảng conversations rỗng, dựng lại từ messages rồi upsert
    if (!convos.length) {
      const latestPerUser = await Message.aggregate([
        {
          $match: {
            $or: [
              { receiverId: new mongoose.Types.ObjectId(ADMIN_ID) },
              { senderId:   new mongoose.Types.ObjectId(ADMIN_ID) }
            ]
          }
        },
        {
          $project: {
            userId: {
              $cond: [
                { $eq: ["$senderId", new mongoose.Types.ObjectId(ADMIN_ID)] },
                "$receiverId",
                "$senderId"
              ]
            },
            message: 1,
            timestamp: 1
          }
        },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: "$userId",
            lastMessage: { $first: "$message" },
            updatedAt:   { $first: "$timestamp" }
          }
        }
      ]);

      await Promise.all(latestPerUser.map(row =>
        Conversation.findOneAndUpdate(
          { user: row._id, admin: ADMIN_ID },
          {
            $set: {
              lastMessage: (row.lastMessage === "" ? "Đã gửi hình ảnh" : row.lastMessage),
              updatedAt: row.updatedAt || new Date()
            }
          },
          { upsert: true }
        )
      ));

      // nạp lại sau khi upsert
      convos = await Conversation.find({ admin: ADMIN_ID })
        .populate("user", "email")
        .sort({ updatedAt: -1 });
    }

    res.json(convos.map(c => ({
      userId: c.user?._id,
      email: c.user?.email || "Unknown",
      lastMessage: c.lastMessage,
      updatedAt: c.updatedAt,
    })));
  } catch (err) {
    console.error("❌ Error getConversations:", err);
    res.status(500).json({ error: err.message });
  }
};


// Lấy toàn bộ tin nhắn giữa admin và 1 user (panel phải)
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: ADMIN_ID },
        { senderId: ADMIN_ID, receiverId: userId }
      ]
    })
      .populate("senderId", "email")
      .populate("receiverId", "email")
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
