const mongoose = require('./db');

const LogSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:     { type: String, required: true }
}, {
  collection: 'logs',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

module.exports = mongoose.model('Log', LogSchema);
