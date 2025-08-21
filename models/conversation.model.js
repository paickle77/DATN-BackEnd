const mongoose = require('./db');

const conversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  lastMessage: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Conversation", conversationSchema);
