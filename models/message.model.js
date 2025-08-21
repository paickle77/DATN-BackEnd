const mongoose = require('./db');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  message: { type: String },
  imageUrl: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Messages", messageSchema);