const Message = require("../models/message.model");
const Conversation = require("../models/conversation.model");

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
        lastMessage: lastMessageContent,
        updatedAt: new Date()
      });
    } else {
      convo.lastMessage = message;
      convo.updatedAt = new Date();
    }
    await convo.save();

    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy danh sách user đã nhắn tới admin (panel trái)
exports.getConversations = async (req, res) => {
  try {
    const convos = await Conversation.find({ admin: ADMIN_ID })
      .populate("user", "email")
      .sort({ updatedAt: -1 });

    const result = convos.map((c) => ({
      userId: c.user?._id,       // thêm ? để tránh crash khi user null
      email: c.user?.email || "Unknown",
      lastMessage: c.lastMessage,
      updatedAt: c.updatedAt,
    }));

    return res.json(result);
  } catch (err) {
    console.error("❌ Error getConversations:", err);
    return res.status(500).json({ error: err.message });
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
