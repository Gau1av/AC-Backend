// backend/models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  blog:      { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
  name:      { type: String, required: true, trim: true, maxlength: 60 },
  email:     { type: String, required: true, trim: true, lowercase: true },
  message:   { type: String, required: true, trim: true, maxlength: 1000 },
  status:    { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  ipAddress: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);