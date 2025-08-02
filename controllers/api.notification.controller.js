// controllers/api.notification.controller.js
const Base = require('./base.controller');
const Notification = require('../models/notification.model');

const controller = Base(Notification);

// POST /notifications
controller.Add = async (req, res) => {
  try {
    const { user_id, content } = req.body;
    // tự sinh title từ content (hoặc dùng một chuỗi mặc định)
    const title = content.length > 50
      ? content.slice(0, 50) + '…'
      : content;
    
    const note = await Notification.create({
      user_id,
      content,
      title
      // created_at sẽ tự động đặt bởi timestamps
    });

    res.status(201).json({ msg: 'OK', data: note });
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

module.exports = controller;
