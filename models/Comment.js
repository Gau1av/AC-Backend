const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true
    },
    message: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved' // Set 'Approved' so it displays instantly, or 'Pending' if you want admin moderation
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);